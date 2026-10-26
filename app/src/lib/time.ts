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
