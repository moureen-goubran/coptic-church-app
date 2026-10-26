// Runs the real migration and seed against an in-memory Postgres (PGlite), with
// small stand-ins for the Supabase-only pieces (auth schema, roles, pg_cron).
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const migration = readFileSync(new URL("supabase/migrations/20261026000000_init.sql", root), "utf8")
  .replace("create extension if not exists pg_cron;", "")
  .replace(/select cron\.schedule\([^;]*\$\$[^$]*\$\$\);/, "");
const seed = readFileSync(new URL("supabase/seed.sql", root), "utf8");

const STUBS = `
  create role anon; create role authenticated;
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
    expect(s.rows[0].n).toBe(59);
  });

  it("lets the public read places and schedules, but not admin notes", async () => {
    const r = await as("anon", null, "select * from public.public_places");
    expect(r.rows.length).toBeGreaterThan(300);
    expect(Object.keys(r.rows[0])).not.toContain("notes");
    await expect(as("anon", null, "select notes from public.places")).rejects.toThrow();
    expect((await as("anon", null, "select count(*)::int n from public.services")).rows[0].n).toBe(59);
  });

  it("blocks the public from writing anything", async () => {
    await expect(as("anon", null, "update public.places set name = 'x'")).rejects.toThrow();
    await expect(as("anon", null, "insert into public.corrections (message) values ('hello')")).rejects.toThrow();
    await expect(as("anon", null, "select * from public.corrections")).rejects.toThrow();
  });

  it("lets clergy edit only their own church", async () => {
    const own = await as("authenticated", CLERGY, "update public.places set phone = '+1 201-000-0000' where id = 'nj-jersey-city-st-mark-jersey-city' returning id");
    expect(own.rows.length).toBe(1);
    const other = await as("authenticated", CLERGY, "update public.places set phone = '1' where id = 'nj-bayonne-virgin-mary-st-john' returning id");
    expect(other.rows.length).toBe(0);
    await expect(as("authenticated", CLERGY, "insert into public.services (place_id, day, start_time, kind, title_en) values ('nj-bayonne-virgin-mary-st-john', 0, '08:00', 'liturgy', 'x')")).rejects.toThrow();
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
    expect(s.rows[0].n).toBe(59);
  });
});
