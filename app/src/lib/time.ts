import type { Service } from "./types";
import type { Lang } from "../i18n";

export function fmtTime(hhmm: string, lang: Lang): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: m ? "2-digit" : undefined });
}

export function fmtDate(iso: string, lang: Lang): string {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

// The next time a weekly service happens, from `now` (the phone's local time).
export function nextService(list: Service[], now = new Date()): { s: Service; inDays: number } | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  let best: { s: Service; inDays: number; key: number } | null = null;
  for (const s of list) {
    const [h, m] = s.start.split(":").map(Number);
    let inDays = (s.day - now.getDay() + 7) % 7;
    if (inDays === 0 && h * 60 + m <= mins) inDays = 7;
    const key = inDays * 1440 + h * 60 + m;
    if (!best || key < best.key) best = { s, inDays, key };
  }
  return best && { s: best.s, inDays: best.inDays };
}

export const serviceKey = (s: Service) => `${s.place_id}|${s.day}|${s.start}|${s.title_en}`;

// Every weekly service happening in the next `days` days, soonest first.
export function upcoming(list: Service[], now = new Date(), days = 14): { s: Service; date: Date; inDays: number }[] {
  const mins = now.getHours() * 60 + now.getMinutes(), out = [];
  for (let off = 0; off < days; off++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
    for (const s of list) {
      if (s.day !== date.getDay()) continue;
      const [h, m] = s.start.split(":").map(Number);
      if (off === 0 && h * 60 + m <= mins) continue;
      out.push({ s, date, inDays: off, key: off * 1440 + h * 60 + m });
    }
  }
  return out.sort((a, b) => a.key - b.key).map(({ s, date, inDays }) => ({ s, date, inDays }));
}
