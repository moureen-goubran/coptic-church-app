// Reads each church's own website (in a real browser, so Wix/Squarespace pages render) and keeps only the
// lines that matter for the app: service times, office phone and email. Runs on GitHub (our cloud can't
// reach church sites). Output: data/sources/site-scrape/sites-<date>.txt, one block per church, uploaded as a
// run artifact and not committed (it holds priests' personal contacts). A person (or Claude) then turns those
// lines into data/services.csv rows and office contacts; nothing here goes live by itself.
// Usage: node tools/scrape-church-sites.mjs [only-these-ids...]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { parseCsv } from "../app/scripts/csv.mjs";

const PLATFORMS = /(^|\.)(facebook|instagram|youtube|twitter|x|tiktok|linktr)\.(com|ee)$/;
const SUBPAGE = /schedule|service|liturg|mass|prayer|times|hours|contact|about|visit|weekly|calendar|القداس|مواعيد/i;
const TIME = /\b\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)\b|\b\d{1,2}:\d{2}\b/i;
const DAY = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b|الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت/i;
const CONTACT = /[\w.+-]+@[\w-]+\.[\w.-]+|\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const SPAM = /\b(casino|slot gacor|judi|togel|sportsbook|porn|escort|viagra)\b|domain (is|may be) for sale|buy this domain/i;

const only = process.argv.slice(2);
const places = parseCsv(readFileSync(new URL("../data/places.csv", import.meta.url), "utf8"))
  .filter(p => p.website && !PLATFORMS.test(new URL(p.website).hostname.replace(/^www\./, "")))
  .filter(p => !only.length || only.includes(p.id));

// Keep matching lines plus one line on each side, so "Sunday" on one line and "8:00 AM" on the next stay together.
function keep(text) {
  const lines = text.split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out = new Set();
  lines.forEach((l, i) => {
    if (l.length > 300) return;
    if (TIME.test(l) || (DAY.test(l) && l.length < 80) || CONTACT.test(l)) for (const j of [i - 1, i, i + 1]) if (lines[j] && lines[j].length <= 300) out.add(j);
  });
  return [...out].sort((a, b) => a - b).map(j => lines[j]);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" });
await ctx.route("**/*", r => ["image", "media", "font"].includes(r.request().resourceType()) ? r.abort() : r.continue());

async function read(url) {
  const page = await ctx.newPage();
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.body?.innerText ?? "");
    const links = await page.$$eval("a[href]", as => as.map(a => ({ href: a.href, text: (a.innerText || "").trim().slice(0, 60) })));
    return { status: res?.status() ?? 0, final: page.url(), text, links };
  } finally { await page.close(); }
}

async function scrape(p) {
  const lines = [`### ${p.id} | ${p.website}`];
  try {
    const home = await read(p.website);
    const host = new URL(home.final).hostname;
    lines.push(`status ${home.status} final ${home.final}`);
    if (SPAM.test(home.text)) { lines.push("!! SPAM OR PARKED PAGE"); return lines.join("\n"); }
    const subs = [...new Map(home.links
      .filter(l => { try { const u = new URL(l.href); return u.hostname === host && SUBPAGE.test(l.text + " " + u.pathname); } catch { return false; } })
      .map(l => [l.href.split("#")[0], l])).values()].slice(0, 4);
    lines.push("-- home", ...keep(home.text));
    for (const s of subs) {
      try { const r = await read(s.href); lines.push(`-- ${s.href}`, ...keep(r.text)); } catch (e) { lines.push(`-- ${s.href} failed: ${e.message.split("\n")[0]}`); }
    }
  } catch (e) { lines.push(`!! can't open: ${e.message.split("\n")[0]}`); }
  return lines.join("\n");
}

const blocks = [];
for (let i = 0; i < places.length; i += 6) {
  blocks.push(...await Promise.all(places.slice(i, i + 6).map(scrape)));
  console.log(`${Math.min(i + 6, places.length)}/${places.length}`);
}
await browser.close();
const dir = new URL("../data/sources/site-scrape/", import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL(`sites-${new Date().toISOString().slice(0, 10)}.txt`, dir), blocks.join("\n\n") + "\n");
