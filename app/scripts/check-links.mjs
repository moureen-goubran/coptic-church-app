// Safety check for outside links (runs weekly on GitHub). Church websites can expire and be bought by
// spam, gambling or adult sites, so every church and Coptic Welcome link is opened and checked for:
// dead links, links that now send you to a different site, parked or spam pages, and plain http.
// Big platforms (Facebook, YouTube...) can't be taken over, so those links are only checked for being gone.
// With a free Google Safe Browsing key (secret SAFE_BROWSING_KEY) every link is also checked for malware and phishing.
// Also checks that the live site still sends its security headers. Prints a report; fails on spam, malware or a lost header.
import { readFileSync, appendFileSync } from "node:fs";
import { parseCsv } from "./csv.mjs";

const DATA = new URL("../../data/", import.meta.url);
const read = name => parseCsv(readFileSync(new URL(name, DATA), "utf8"));
const LIVE = process.env.LIVE_URL || "https://coptic-church-app.moureenjgoubran.workers.dev/";
const PLATFORMS = ["facebook.com", "instagram.com", "youtube.com", "twitter.com", "x.com", "tiktok.com", "pushpay.com", "paypal.com",
  "google.com", "forms.gle", "ccbchurch.com", "givelify.com", "tithe.ly", "apple.com"];
const SPAM = /\b(casino|slot gacor|judi|togel|sportsbook|betting odds|porn|xxx(?!-)|escort|viagra|cialis)\b|domain (is|may be) for sale|buy this domain|hugedomains|sedo\.com|dan\.com\/buy|parked free|domain parking/i;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
// Outside pages the app itself links to (not in the data files).
const APP_LINKS = ["https://st-takla.org/books/en/church/synaxarium/", "https://988lifeline.org"];
const SAFE_BROWSING_KEY = process.env.SAFE_BROWSING_KEY;
const NEEDED_HEADERS = ["content-security-policy", "strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy"];

const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
// "site.org" from "sub.site.org" (good enough for church sites; .co.uk-style names compare on 3 parts).
const base = h => h.split(".").slice(/\.(co|com|org|net)\.[a-z]{2}$/.test(h) ? -3 : -2).join(".");
const isPlatform = h => PLATFORMS.some(d => h === d || h.endsWith("." + d));

async function open(url) {
  let at = url;
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(at, { redirect: "manual", headers: { "user-agent": UA, accept: "text/html,*/*" }, signal: AbortSignal.timeout(20000) });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) { at = new URL(next, at).href; continue; }
    const body = res.ok && /html|text/.test(res.headers.get("content-type") ?? "") ? (await res.text()).slice(0, 300000) : "";
    return { status: res.status, final: at, body };
  }
  return { status: 0, final: at, body: "", error: "too many redirects" };
}

async function check({ url, where }) {
  try {
    const r = await open(url);
    const problems = [];
    if (isPlatform(host(url))) {
      if (r.status === 404 || r.status === 410) problems.push(`page is gone (${r.status})`);
      return { url, where, final: r.final, problems, spam: false };
    }
    if (r.error) problems.push(r.error);
    else if (r.status === 403 || r.status === 429) problems.push(`blocks robots (${r.status}), check by hand`);
    else if (r.status >= 400) problems.push(`broken (${r.status})`);
    const spam = r.body.match(SPAM);
    // The words around the match, so a person can tell real spam from an innocent use of the word.
    if (spam) problems.push(`SPAM OR PARKED PAGE: "…${r.body.slice(Math.max(0, spam.index - 60), spam.index + 60).replace(/\s+/g, " ").replace(/[|<>]/g, " ")}…"`);
    if (base(host(r.final)) !== base(host(url))) problems.push(`now goes to ${host(r.final)}`);
    if (url.startsWith("http://") && !r.final.startsWith("https://")) problems.push("no https");
    else if (url.startsWith("http://")) problems.push("works with https: update the link");
    return { url, where, final: r.final, problems, spam: Boolean(spam) };
  } catch (e) {
    return { url, where, problems: [`can't open (${e.cause?.code ?? e.name})`], spam: false };
  }
}

const targets = [];
const add = (url, where) => { if (url && /^https?:\/\//.test(url)) targets.push({ url, where }); };
for (const r of read("places.csv")) add(r.website, `places.csv ${r.id}`);
for (const r of read("links.csv")) add(r.url, `links.csv ${r.place_id}`);
for (const r of read("resources.csv")) add(r.url, `resources.csv ${r.id}`);
for (const u of APP_LINKS) add(u, "app");

const results = [];
for (let i = 0; i < targets.length; i += 10) results.push(...await Promise.all(targets.slice(i, i + 10).map(check)));

// Google Safe Browsing: both the link and where it ends up, 500 at a time.
let sbNote = "Malware check: off (add the free SAFE_BROWSING_KEY secret, see docs/setup-guide.md)";
if (SAFE_BROWSING_KEY) {
  try {
    const all = [...new Set(results.flatMap(r => [r.url, r.final].filter(Boolean)))];
    const hits = new Map();
    for (let i = 0; i < all.length; i += 500) {
      const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_KEY}`, {
        method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ client: { clientId: "my-coptic-church", clientVersion: "1" }, threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"], threatEntries: all.slice(i, i + 500).map(url => ({ url })) } }),
      });
      if (!res.ok) throw new Error(`Safe Browsing answered ${res.status}`);
      for (const m of (await res.json()).matches ?? []) hits.set(m.threat.url, m.threatType);
    }
    for (const r of results) {
      const t = hits.get(r.url) ?? hits.get(r.final);
      if (t) { r.problems.unshift(`GOOGLE SAFE BROWSING: ${t}`); r.spam = true; }
    }
    sbNote = `Malware check (Google Safe Browsing): ${hits.size ? `${hits.size} flagged` : "nothing flagged"}`;
  } catch (e) { sbNote = `Malware check failed: ${e.message}`; }
}
const bad = results.filter(r => r.problems.length);
const order = r => (r.spam ? 0 : r.problems.some(p => p.startsWith("now goes")) ? 1 : r.problems.some(p => /broken|can't/.test(p)) ? 2 : 3);
bad.sort((a, b) => order(a) - order(b));

let live = [];
try {
  const res = await fetch(LIVE, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
  live = NEEDED_HEADERS.filter(h => !res.headers.get(h)).map(h => `missing header ${h}`);
  if (!res.ok) live.push(`live site answered ${res.status}`);
} catch (e) { live = [`can't open live site (${e.cause?.code ?? e.name})`]; }

const lines = [
  `## Link safety check`,
  `Checked ${results.length} links. ${bad.filter(r => r.spam).length} spam or parked, ${bad.length} need a look.`,
  `Live site security headers: ${live.length ? live.join("; ") : "all present"}`, sbNote, "",
  ...(bad.length ? ["| Link | Where | Problem |", "|---|---|---|", ...bad.map(r => `| ${r.url} | ${r.where} | ${r.problems.join("; ")} |`)] : []),
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
if (bad.some(r => r.spam) || live.some(l => l.startsWith("missing"))) process.exitCode = 1;
