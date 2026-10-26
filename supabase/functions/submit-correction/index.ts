// Corrections box endpoint. Checks the Cloudflare Turnstile token, screens the message,
// then saves it to the private corrections table (only admins can read it).
// Secrets: TURNSTILE_SECRET, ALLOWED_ORIGIN (e.g. https://church.datumarc.com).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { screenMessage } from "../_shared/screen.ts";

const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://church.datumarc.com";
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, apikey, authorization" };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method" });
  let body: { place_id?: string; message?: string; token?: string };
  try { body = await req.json(); } catch { return reply(400, { error: "bad_request" }); }

  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: Deno.env.get("TURNSTILE_SECRET") ?? "", response: body.token ?? "" }),
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!check.success) return reply(403, { error: "bot_check" });

  const screened = screenMessage(String(body.message ?? ""));
  if (!screened.ok) return reply(422, { error: screened.reason });
  const placeId = typeof body.place_id === "string" && /^[a-z0-9-]{1,120}$/.test(body.place_id) ? body.place_id : null;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await db.from("corrections").insert({ place_id: placeId, message: screened.text });
  if (error) return reply(500, { error: "save" });
  return reply(200, { ok: true });
});
