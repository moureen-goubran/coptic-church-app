// Corrections box endpoint. Checks the Cloudflare Turnstile token, screens the message,
// then saves it to the private corrections table (only admins can read it).
// Then emails it to the owner (Resend). Safety concerns get an URGENT subject.
// Secrets: TURNSTILE_SECRET, ALLOWED_ORIGIN (one site address, or several separated by commas),
// RESEND_API_KEY and NOTIFY_EMAIL (no email is sent until both are set).
// Event suggestions also carry the form's fields ("event") and go to the private event_suggestions table
// (and church_suggestions when the church isn't in the app yet) instead of corrections.
import { screenMessage } from "../_shared/screen.ts";

const ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") ?? "https://coptic.myorthodoxchurch.com,https://coptic-church-app.moureenjgoubran.workers.dev")
  .split(",").map(o => o.trim().replace(/\/+$/, "")).filter(Boolean);
// Browsers only accept one allowed address per answer, so echo the asking site when it's on the list.
const corsFor = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, apikey, authorization" };
};

const TOPICS = ["info", "safety", "other", "suggestion", "claim", "event"];
const SUBJECTS: Record<string, string> = {
  safety: "URGENT: MY-COPTIC-CHURCH CONCERN",
  suggestion: "SUGGESTION: MY-COPTIC-CHURCH",
  info: "REPORT: MY-COPTIC-CHURCH WRONG OR MISSING INFO",
  other: "REPORT: MY-COPTIC-CHURCH",
  claim: "CLAIM: MY-COPTIC-CHURCH IS THIS YOUR CHURCH",
  event: "EVENT SUGGESTION: MY-COPTIC-CHURCH",
};
const LABELS: Record<string, string> = { safety: "Safety concern", suggestion: "Suggestion", info: "Wrong or missing info", other: "Something else", claim: "Is this your church? (confirm by calling the church's public number)",
  event: "Event suggestion (check it with the church before adding it to data/events.csv)" };

// The server key: a legacy service_role JWT goes in both headers; a new secret key (sb_secret_...) is not a JWT
// and must only go in apikey, or the database treats the call as an anonymous visitor (error 42501).
const SERVER_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const dbHeaders = { apikey: SERVER_KEY, ...(SERVER_KEY.startsWith("eyJ") ? { authorization: `Bearer ${SERVER_KEY}` } : {}), "content-type": "application/json" };
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`, { ...init, headers: { ...dbHeaders, ...init.headers }, signal: AbortSignal.timeout(10000) });

// Plain-text email to the owner. The message already passed the screen (no contact info or links).
async function notify(topic: string, placeId: string | null, message: string) {
  const key = Deno.env.get("RESEND_API_KEY"), to = Deno.env.get("NOTIFY_EMAIL");
  if (!key || !to) return;
  let church = "None (app-wide)";
  if (placeId) {
    const [data] = await rest(`places?select=name,city,state&id=eq.${placeId}`).then(r => r.ok ? r.json() : []).catch(() => []);
    church = data ? `${data.name}, ${data.city} ${data.state}` : placeId;
  }
  const text = [`Type: ${LABELS[topic]}`, `Church: ${church}`, `Sent: ${new Date().toUTCString()}`, "", message, "",
    topic === "event" ? "Saved in Supabase: Table Editor > event_suggestions (a new church is also in church_suggestions). Set status to approved or dismissed."
      : "Read and mark it done in Supabase: Table Editor > corrections. Messages are deleted after 90 days."].join("\n");
  await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: "My Coptic Church <onboarding@resend.dev>", to: [to], subject: SUBJECTS[topic], text }),
    signal: AbortSignal.timeout(10000),
  });
}

const KINDS = ["liturgy", "praise", "bible", "youth", "meeting", "classes", "servants", "retreat", "social", "other"];
type EventFields = { kind?: string; other?: string; date?: string; time?: string; details?: string; new_church?: { name?: string; city?: string; state?: string } };
// One short typed field: screened like the message, empty becomes null.
const field = (v: unknown, max: number): { ok: true; v: string | null } | { ok: false; reason: string } => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return { ok: true, v: null };
  const r = screenMessage("Field: " + s); // the prefix lets two-letter values like "NJ" pass the length check
  return r.ok ? { ok: true, v: s.slice(0, max) } : { ok: false, reason: r.reason };
};

async function saveEvent(ev: EventFields | undefined, placeId: string | null) {
  const bad = (error: string) => ({ error, status: 422, codes: [] as string[] });
  if (!ev || !KINDS.includes(ev.kind ?? "")) return bad("bad_request");
  const other = field(ev.other, 120), details = field(ev.details, 1000);
  if (!other.ok) return bad(other.reason);
  if (!details.ok) return bad(details.reason);
  if (ev.kind === "other" && !other.v) return bad("bad_request");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(ev.date ?? "") ? ev.date : null;
  const time = /^\d{2}:\d{2}$/.test(ev.time ?? "") ? ev.time : null;
  let churchId: number | null = null;
  if (!placeId) {
    const name = field(ev.new_church?.name, 140), city = field(ev.new_church?.city, 80), state = field(ev.new_church?.state, 40);
    for (const f of [name, city, state]) if (!f.ok) return bad(f.reason);
    if (!name.ok || !city.ok || !state.ok || !name.v || name.v.length < 3 || !city.v || city.v.length < 2) return bad("bad_request");
    const c = await rest("church_suggestions", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ name: name.v, city: city.v, state: state.v }) });
    if (!c.ok) return { error: "save", status: 500, codes: [await c.json().then(e => e.code, () => String(c.status))] };
    churchId = (await c.json())[0]?.id ?? null;
  }
  const e = await rest("event_suggestions", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({
    place_id: placeId, church_suggestion_id: churchId, kind: ev.kind, other_text: ev.kind === "other" ? other.v : null,
    date, start_time: time, details: details.v,
  }) });
  if (!e.ok) return { error: "save", status: 500, codes: [await e.json().then(x => x.code, () => String(e.status))] };
  return { ok: true };
}

Deno.serve(async req => {
  const cors = corsFor(req);
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method" });
  let body: { place_id?: string; message?: string; token?: string; topic?: string; event?: EventFields };
  try { body = await req.json(); } catch { return reply(400, { error: "bad_request" }); }

  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: Deno.env.get("TURNSTILE_SECRET") ?? "", response: body.token ?? "" }),
  }).then(r => r.json()).catch(() => ({ success: false, "error-codes": ["siteverify-unreachable"] }));
  // Cloudflare's reason codes (e.g. invalid-input-secret) are safe to show and say what to fix.
  if (!check.success) return reply(403, { error: "bot_check", codes: check["error-codes"] ?? [] });

  const screened = screenMessage(String(body.message ?? ""));
  if (!screened.ok) return reply(422, { error: screened.reason });
  const placeId = typeof body.place_id === "string" && /^[a-z0-9-]{1,120}$/.test(body.place_id) ? body.place_id : null;

  const topic = TOPICS.includes(body.topic ?? "") ? body.topic! : "info";

  if (topic === "event") {
    const saved = await saveEvent(body.event, placeId);
    if ("error" in saved) return reply(saved.status, { error: saved.error, codes: saved.codes });
    await notify(topic, placeId, screened.text).catch(() => {});
    return reply(200, { ok: true });
  }

  // The topic is kept as a tag at the start of the message, so the table shows it without a schema change.
  const saved = topic === "info" ? screened.text : `[${topic}] ${screened.text}`;
  const save = await rest("corrections", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({ place_id: placeId, message: saved.slice(0, 1000) }) });
  if (!save.ok) return reply(500, { error: "save", codes: [await save.json().then(e => e.code, () => String(save.status))] });
  await notify(topic, placeId, screened.text).catch(() => {}); // the message is saved even if the email fails
  return reply(200, { ok: true });
});
