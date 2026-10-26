// Weekly leak check (runs on GitHub with the link check). Acts like a stranger holding the app's public key
// and tries to read or change private data: report messages, admin notes, admin and editor lists, edit history.
// Every attempt must be refused. Also asks Supabase's own security advisor for warnings (needs the
// SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF secrets) and checks the app's packages for known holes.
// Prints a report; fails (GitHub emails the owner) on any leak or warning.
import { appendFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const config = readFileSync(new URL("../src/config.ts", import.meta.url), "utf8");
const BASE = config.match(/"(https:\/\/[a-z0-9]+\.supabase\.co)"/)?.[1];
const KEY = config.match(/"(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)"/)?.[1];
const headers = { apikey: KEY, ...(KEY?.startsWith("eyJ") ? { authorization: `Bearer ${KEY}` } : {}), "content-type": "application/json" };
const problems = [], notes = [];

async function rest(path, init = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(20000) });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { status: res.status, body };
}
// Refused = an error status, or an empty list (row security hides every row).
const refused = r => r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0);

if (!BASE || !KEY) problems.push("can't find the Supabase address or public key in app/src/config.ts");
else try {
  const live = await rest("public_places?select=id&limit=1");
  if (!(live.status === 200 && live.body?.length === 1)) problems.push(`the public church list doesn't load (${live.status})`);
  const reads = {
    "report messages": "corrections?select=id,message&limit=1",
    "admin notes on churches": "places?select=notes,source_url&limit=1",
    "admin list": "admins?select=*&limit=1",
    "church editor list": "place_editors?select=*&limit=1",
    "edit history": "audit_log?select=*&limit=1",
    "links waiting for approval": "place_links?select=id&approved=eq.false&limit=1",
  };
  for (const [what, path] of Object.entries(reads)) {
    const r = await rest(path);
    if (!refused(r)) problems.push(`LEAK: a stranger can read ${what} (${r.status})`);
  }
  const writes = {
    "add a church": ["places", { id: "zz-leak-test", name: "Leak test", type: "church", city: "X", state: "NJ" }],
    "add a service time": ["services", { place_id: "zz-leak-test", day: 0, start_time: "09:00", kind: "liturgy", title_en: "Leak test" }],
    "add a link": ["place_links", { place_id: "zz-leak-test", kind: "other", url: "https://example.com", approved: true }],
    "post a report without the bot check": ["corrections", { message: "Leak test" }],
  };
  for (const [what, [table, row]] of Object.entries(writes)) {
    const r = await rest(table, { method: "POST", body: JSON.stringify(row), headers: { prefer: "return=minimal" } });
    if (r.status < 400) problems.push(`LEAK: a stranger can ${what} (${r.status})`);
  }
  const edit = await rest("places?id=neq.none", { method: "PATCH", body: JSON.stringify({ phone: "000" }), headers: { prefer: "return=representation" } });
  if (!refused(edit)) problems.push(`LEAK: a stranger can change church details (${edit.status})`);
} catch (e) { problems.push(`can't reach the database (${e.cause?.code ?? e.name})`); }

// Supabase's security advisor: the same warnings its dashboard shows.
const { SUPABASE_ACCESS_TOKEN: TOKEN, SUPABASE_PROJECT_REF: REF } = process.env;
if (TOKEN && REF) {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/advisors/security`, { headers: { authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) notes.push(`Supabase advisor: couldn't ask (${res.status})`);
    else {
      const lints = ((await res.json()).lints ?? []).filter(l => l.level === "ERROR" || l.level === "WARN");
      for (const l of lints) problems.push(`Supabase advisor (${l.level}): ${l.title}: ${l.detail}`);
      notes.push(`Supabase advisor: ${lints.length ? `${lints.length} warnings` : "no warnings"}`);
    }
  } catch (e) { notes.push(`Supabase advisor: couldn't ask (${e.name})`); }
} else notes.push("Supabase advisor: off (needs the SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF secrets)");

// Known security holes in the app's packages (high or critical only).
try {
  execSync("npm audit --omit=dev --audit-level=high", { cwd: new URL("..", import.meta.url), stdio: "pipe" });
  notes.push("App packages: no known high-risk holes");
} catch (e) {
  const out = String(e.stdout ?? "");
  if (/vulnerabilit/i.test(out)) problems.push(`App packages have known security holes: ${out.split("\n").filter(l => /Severity|vulnerabilit/i.test(l)).slice(0, 5).join(" | ")}`);
  else notes.push("App packages: couldn't check");
}

const lines = ["## Leak check", problems.length ? `${problems.length} problem(s) found:` : "No leaks found. Private data is locked.",
  ...problems.map(p => `- ${p}`), ...notes.map(n => `- ${n}`)];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
if (problems.length) process.exitCode = 1;
