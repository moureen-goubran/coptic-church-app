// Corrections box endpoint. Checks the Cloudflare Turnstile token, screens the message,
// then saves it to the private corrections table (only admins can read it).
// Then emails it to the owner (Resend). Safety concerns get an URGENT subject.
// Secrets: TURNSTILE_SECRET, ALLOWED_ORIGIN (one site address, or several separated by commas),
// RESEND_API_KEY and NOTIFY_EMAIL (no email is sent until both are set).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { screenMessage } from "../_shared/screen.ts";

const ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") ?? "https://coptic.myorthodoxchurch.com,https://coptic-church-app.moureenjgoubran.workers.dev")
  .split(",").map(o => o.trim().replace(/\/+$/, "")).filter(Boolean);
// Browsers only accept one allowed address per answer, so echo the asking site when it's on the list.
const corsFor = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, apikey, authorization" };
};

const TOPICS = ["info", "safety", "other", "suggestion", "claim"];
const SUBJECTS: Record<string, string> = {
  safety: "URGENT: MY-COPTIC-CHURCH CONCERN",
  suggestion: "SUGGESTION: MY-COPTIC-CHURCH",
  info: "REPORT: MY-COPTIC-CHURCH WRONG OR MISSING INFO",
  other: "REPORT: MY-COPTIC-CHURCH",
  claim: "CLAIM: MY-COPTIC-CHURCH IS THIS YOUR CHURCH",
};
const LABELS: Record<string, string> = { safety: "Safety concern", suggestion: "Suggestion", info: "Wrong or missing info", other: "Something else", claim: "Is this your church? (confirm by calling the church's public number)" };

// Plain-text email to the owner. The message already passed the screen (no contact info or links).
async function notify(db: ReturnType<typeof createClient>, topic: string, placeId: string | null, message: string) {
  const key = Deno.env.get("RESEND_API_KEY"), to = Deno.env.get("NOTIFY_EMAIL");
  if (!key || !to) return;
  let church = "None (app-wide)";
  if (placeId) {
    const { data } = await db.from("places").select("name, city, state").eq("id", placeId).maybeSingle();
    church = data ? `${data.name}, ${data.city} ${data.state}` : placeId;
  }
  const text = [`Type: ${LABELS[topic]}`, `Church: ${church}`, `Sent: ${new Date().toUTCString()}`, "", message, "",
    "Read and mark it done in Supabase: Table Editor > corrections. Messages are deleted after 90 days."].join("\n");
  await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: "My Coptic Church <onboarding@resend.dev>", to: [to], subject: SUBJECTS[topic], text }),
    signal: AbortSignal.timeout(10000),
  });
}

Deno.serve(async req => {
  const cors = corsFor(req);
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method" });
  let body: { place_id?: string; message?: string; token?: string; topic?: string };
  try { body = await req.json(); } catch { return reply(400, { error: "bad_request" }); }

  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: Deno.env.get("TURNSTILE_SECRET") ?? "", response: body.token ?? "" }),
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!check.success) return reply(403, { error: "bot_check" });

  const screened = screenMessage(String(body.message ?? ""));
  if (!screened.ok) return reply(422, { error: screened.reason });
  const placeId = typeof body.place_id === "string" && /^[a-z0-9-]{1,120}$/.test(body.place_id) ? body.place_id : null;

  const topic = TOPICS.includes(body.topic ?? "") ? body.topic! : "info";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // The topic is kept as a tag at the start of the message, so the table shows it without a schema change.
  const saved = topic === "info" ? screened.text : `[${topic}] ${screened.text}`;
  const { error } = await db.from("corrections").insert({ place_id: placeId, message: saved.slice(0, 1000) });
  if (error) return reply(500, { error: "save" });
  await notify(db, topic, placeId, screened.text).catch(() => {}); // the message is saved even if the email fails
  return reply(200, { ok: true });
});
