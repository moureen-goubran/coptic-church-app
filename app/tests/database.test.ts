// Runs the real migration and seed against an in-memory Postgres (PGlite), with
// small stand-ins for the Supabase-only pieces (auth schema, roles, pg_cron).
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const dir = new URL("supabase/migrations/", root);
const migration = readdirSync(dir).filter(f => f.endsWith(".sql")).sort().map(f => readFileSync(new URL(f, dir), "utf8")).join("\n")
  .replace("create extension if not exists pg_cron with schema pg_catalog;", "")
  .replace(/select cron\.schedule\([^;]*\$\$[^$]*\$\$\);/g, "");
const seed = readFileSync(new URL("supabase/seed.sql", root), "utf8");

const STUBS = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;
const ADMIN = "00000000-0000-0000-0000-000000000001";
const CLERGY = "00000000-0000-0000-0000-000000000002";
let db: PGlite;

async function as(role: string, uid: string | null, q: string) {
  await db.exec(`reset role; select set_config('test.uid', '${uid ?? ""}', false); set role ${role};`);
  try { return await db.query<any>(q); } finally { await db.exec("reset role;"); }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(migration);
  await db.exec(seed);
  await db.exec(`insert into auth.users values ('${ADMIN}'), ('${CLERGY}');
    insert into public.admins values ('${ADMIN}');
    insert into public.place_editors (user_id, place_id) values ('${CLERGY}', 'nj-jersey-city-st-mark-jersey-city');`);
}, 60000);

describe("database", () => {
  it("loads every place and service time", async () => {
    const p = await db.query<any>("select count(*)::int n from public.places");
    const s = await db.query<any>("select count(*)::int n from public.services");
    expect(p.rows[0].n).toBeGreaterThan(300);
    expect(s.rows[0].n).toBe(74);
  });

  it("lets the public read places and schedules, but not admin notes", async () => {
    const r = await as("anon", null, "select * from public.public_places");
    expect(r.rows.length).toBeGreaterThan(300);
    expect(Object.keys(r.rows[0])).not.toContain("notes");
    await expect(as("anon", null, "select notes from public.places")).rejects.toThrow();
    expect((await as("anon", null, "select count(*)::int n from public.services")).rows[0].n).toBe(74);
  });

  it("blocks the public from writing anything", async () => {
    await expect(as("anon", null, "update public.places set name = 'x'")).rejects.toThrow();
    await expect(as("anon", null, "insert into public.corrections (message) values ('hello')")).rejects.toThrow();
    await expect(as("anon", null, "select * from public.corrections")).rejects.toThrow();
  });

  it("lets the report box's server function save reports and read church names", async () => {
    await as("service_role", null, "insert into public.corrections (message) values ('hello')");
    await as("service_role", null, "select name, city, state from public.places limit 1");
  });

  it("keeps event and new-church suggestions private until an admin reads them", async () => {
    const c = await as("service_role", null, "insert into public.church_suggestions (name, city, state) values ('St. Mina Coptic Orthodox Church', 'Newark', 'NJ') returning id");
    await as("service_role", null, `insert into public.event_suggestions (church_suggestion_id, kind, other_text) values (${c.rows[0].id}, 'other', 'Coptic hymns class')`);
    await as("service_role", null, "insert into public.event_suggestions (place_id, kind, date, start_time) values ('nj-jersey-city-st-mark-jersey-city', 'youth', '2026-11-20', '19:30')");
    await expect(as("service_role", null, "insert into public.event_suggestions (place_id, kind) values ('nj-jersey-city-st-mark-jersey-city', 'other')")).rejects.toThrow();
    await expect(as("service_role", null, "insert into public.event_suggestions (kind) values ('youth')")).rejects.toThrow();
    for (const t of ["event_suggestions", "church_suggestions"]) {
      await expect(as("anon", null, `select * from public.${t}`)).rejects.toThrow();
      await expect(as("anon", null, `insert into public.${t} (kind, name) values ('youth', 'x')`)).rejects.toThrow();
      expect((await as("authenticated", CLERGY, `select count(*)::int n from public.${t}`)).rows[0].n).toBe(0);
      expect((await as("authenticated", ADMIN, `select count(*)::int n from public.${t}`)).rows[0].n).toBeGreaterThan(0);
    }
  });

  it("lets clergy edit only their own church", async () => {
    const own = await as("authenticated", CLERGY, "update public.places set phone = '+1 201-000-0000' where id = 'nj-jersey-city-st-mark-jersey-city' returning id");
    expect(own.rows.length).toBe(1);
    const other = await as("authenticated", CLERGY, "update public.places set phone = '1' where id = 'nj-bayonne-virgin-mary-st-john' returning id");
    expect(other.rows.length).toBe(0);
    await expect(as("authenticated", CLERGY, "insert into public.services (place_id, day, start_time, kind, title_en) values ('nj-bayonne-virgin-mary-st-john', 0, '08:00', 'liturgy', 'x')")).rejects.toThrow();
  });

  it("shows church details, clergy and approved links to the public", async () => {
    const id = "nj-jersey-city-st-mark-jersey-city";
    expect((await as("anon", null, `select parking_en from public.place_details where place_id = '${id}'`)).rows[0].parking_en).toMatch(/parking/i);
    expect((await as("anon", null, `select count(*)::int n from public.clergy where place_id = '${id}'`)).rows[0].n).toBe(4);
    expect((await as("anon", null, `select count(*)::int n from public.place_links where place_id = '${id}' and kind = 'live'`)).rows[0].n).toBe(1);
    await expect(as("anon", null, "insert into public.place_links (place_id, kind, url) values ('nj-bayonne-virgin-mary-st-john', 'live', 'https://example.com')")).rejects.toThrow();
  });

  it("keeps a link clergy add hidden until an admin approves it", async () => {
    const id = "nj-jersey-city-st-mark-jersey-city";
    const r = await as("authenticated", CLERGY, `insert into public.place_links (place_id, kind, url, approved) values ('${id}', 'instagram', 'https://instagram.com/x', true) returning id, approved`);
    expect(r.rows[0].approved).toBe(false);
    const linkId = r.rows[0].id;
    expect((await as("anon", null, `select count(*)::int n from public.place_links where id = ${linkId}`)).rows[0].n).toBe(0);
    await as("authenticated", CLERGY, `update public.place_links set approved = true where id = ${linkId}`);
    expect((await as("anon", null, `select count(*)::int n from public.place_links where id = ${linkId}`)).rows[0].n).toBe(0);
    await as("authenticated", ADMIN, `update public.place_links set approved = true where id = ${linkId}`);
    expect((await as("anon", null, `select count(*)::int n from public.place_links where id = ${linkId}`)).rows[0].n).toBe(1);
    // Changing an approved link's address sends it back for approval.
    await as("authenticated", CLERGY, `update public.place_links set url = 'https://instagram.com/y' where id = ${linkId}`);
    expect((await as("anon", null, `select count(*)::int n from public.place_links where id = ${linkId}`)).rows[0].n).toBe(0);
    await expect(as("authenticated", CLERGY, "insert into public.place_links (place_id, kind, url) values ('nj-bayonne-virgin-mary-st-john', 'live', 'https://example.com')")).rejects.toThrow();
    await expect(as("authenticated", CLERGY, `insert into public.place_links (place_id, kind, url) values ('${id}', 'live', 'http://example.com')`)).rejects.toThrow();
  });

  it("shows upcoming and undated events to the public, hides past ones, and lets clergy edit only their own", async () => {
    const own = "nj-jersey-city-st-mark-jersey-city", other = "nj-bayonne-virgin-mary-st-john";
    const n = async (where: string) => (await as("anon", null, `select count(*)::int n from public.events where ${where}`)).rows[0].n;
    expect(await n("date is null")).toBeGreaterThan(5);
    await as("authenticated", CLERGY, `insert into public.events (place_id, date, start_time, kind, title_en) values ('${own}', current_date + 3, '19:00', 'praise', 'Future vespers'), ('${own}', current_date - 5, '19:00', 'praise', 'Old vespers')`);
    expect(await n("title_en = 'Future vespers'")).toBe(1);
    expect(await n("title_en = 'Old vespers'")).toBe(0);
    expect((await as("authenticated", CLERGY, "select count(*)::int n from public.events where title_en = 'Old vespers'")).rows[0].n).toBe(1);
    await expect(as("authenticated", CLERGY, `insert into public.events (place_id, date, kind, title_en) values ('${other}', current_date, 'meeting', 'x')`)).rejects.toThrow();
    await expect(as("anon", null, `insert into public.events (place_id, kind, title_en) values ('${own}', 'meeting', 'x')`)).rejects.toThrow();
    // A time without a date, or a made-up kind, is refused.
    await expect(as("authenticated", CLERGY, `insert into public.events (place_id, start_time, kind, title_en) values ('${own}', '10:00', 'meeting', 'x y')`)).rejects.toThrow();
    await expect(as("authenticated", CLERGY, `insert into public.events (place_id, kind, title_en) values ('${own}', 'party', 'x y')`)).rejects.toThrow();
  });

  it("lets only admins change Coptic Welcome items, and keeps their edits when the import runs again", async () => {
    expect((await as("anon", null, "select count(*)::int n from public.resources where kind = 'link'")).rows[0].n).toBeGreaterThan(5);
    await expect(as("anon", null, "update public.resources set url = 'https://example.com' where id = 'nj-211'")).rejects.toThrow();
    await as("authenticated", CLERGY, "update public.resources set url = 'https://example.com' where id = 'nj-211'");
    expect((await db.query<any>("select url from public.resources where id = 'nj-211'")).rows[0].url).toBe("https://nj211.org");
    await expect(as("authenticated", CLERGY, "insert into public.resources (id, kind, region, title_en, url) values ('x-x', 'link', 'NJ', 'Spam', 'https://example.com')")).rejects.toThrow();
    // A link must be https, and a hidden item isn't shown to the public.
    await expect(as("authenticated", ADMIN, "insert into public.resources (id, kind, region, title_en, url) values ('x-y', 'link', 'NJ', 'Plain', 'http://example.com')")).rejects.toThrow();
    await as("authenticated", ADMIN, "update public.resources set hidden = true, body_en = 'Edited' where id = 'fafsa'");
    expect((await as("anon", null, "select count(*)::int n from public.resources where id = 'fafsa'")).rows[0].n).toBe(0);
    await db.exec(seed);
    expect((await db.query<any>("select body_en from public.resources where id = 'fafsa'")).rows[0].body_en).toBe("Edited");
  });

  it("logs every change", async () => {
    const r = await db.query<any>("select count(*)::int n from public.audit_log where table_name = 'places' and action = 'UPDATE' and row_id = 'nj-jersey-city-st-mark-jersey-city'");
    expect(r.rows[0].n).toBeGreaterThan(0);
  });

  it("re-running the import doesn't overwrite places edited in the app", async () => {
    await db.exec("update public.places set phone = 'edited', edited_in_app = true where id = 'nj-jersey-city-st-mark-jersey-city'");
    await db.exec(seed);
    const r = await db.query<any>("select phone from public.places where id = 'nj-jersey-city-st-mark-jersey-city'");
    expect(r.rows[0].phone).toBe("edited");
    const s = await db.query<any>("select count(*)::int n from public.services");
    expect(s.rows[0].n).toBe(74);
  });
});
