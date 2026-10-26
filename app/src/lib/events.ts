import type { ChurchEvent, Service } from "./types";
import { serviceKey } from "./time";
import { addDays, iso } from "./coptic";

// One shape for everything on the Events tab: a weekly service on a given date, a one-off
// event, or an "also offered" ministry (no date). `key` is what "Save" remembers.
export interface Item {
  key: string; place_id: string; kind: string;
  title_en: string; title_ar: string | null; room_en: string | null; room_ar: string | null;
  date: string | null; end_date: string | null; start: string | null; end: string | null;
  weekly: number | null; // day of the week when it repeats every week
}

const mins = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
export const eventKey = (e: ChurchEvent) => `e|${e.place_id}|${e.date ?? ""}|${e.start ?? ""}|${e.title_en}`;

export const fromService = (s: Service, date: string): Item => ({
  key: serviceKey(s), place_id: s.place_id, kind: s.kind, title_en: s.title_en, title_ar: s.title_ar, room_en: s.room_en, room_ar: s.room_ar,
  date, end_date: null, start: s.start, end: s.end, weekly: s.day,
});
export const fromEvent = (e: ChurchEvent): Item => ({
  key: eventKey(e), place_id: e.place_id, kind: e.kind, title_en: e.title_en, title_ar: e.title_ar, room_en: e.room_en, room_ar: e.room_ar,
  date: e.date, end_date: e.end_date, start: e.start, end: e.end, weekly: null,
});

// The next date (from now) a weekly service happens. Today counts until it starts.
export function nextDateFor(day: number, start: string, now = new Date()): string {
  let off = (day - now.getDay() + 7) % 7;
  if (off === 0 && mins(start) <= now.getHours() * 60 + now.getMinutes()) off = 7;
  return addDays(iso(now), off);
}

// A dated event stays listed until it ends (its end time, else its start time, else the whole day).
export function notOver(e: { date: string | null; end_date: string | null; start: string | null; end: string | null }, now = new Date()): boolean {
  if (!e.date) return true;
  const last = e.end_date ?? e.date, t0 = iso(now);
  if (last !== t0) return last > t0;
  const until = e.end ?? e.start;
  return !until || mins(until) > now.getHours() * 60 + now.getMinutes();
}

// Sort key: date (an event already under way counts as today), then start time.
const sortKey = (it: Item, t0: string) => `${it.date && it.date < t0 ? t0 : it.date ?? "9999"} ${it.start ?? "00:00"}`;
export const byWhen = (t0: string) => (a: Item, b: Item) => sortKey(a, t0).localeCompare(sortKey(b, t0));

export const specialDates = (events: ChurchEvent[], now = new Date()) =>
  events.filter(e => e.date && notOver(e, now)).map(fromEvent).sort(byWhen(iso(now)));
export const alsoOffered = (events: ChurchEvent[]) => events.filter(e => !e.date).map(fromEvent);

// Everything happening in the next `days` days, soonest first: weekly services and special dates.
export function upcomingItems(services: Service[], events: ChurchEvent[], now = new Date(), days = 14): Item[] {
  const t0 = iso(now), last = addDays(t0, days - 1), out: Item[] = [];
  for (let off = 0; off < days; off++) {
    const date = addDays(t0, off), dow = (now.getDay() + off) % 7;
    for (const s of services) if (s.day === dow && (off > 0 || notOver({ date, end_date: null, start: s.start, end: null }, now))) out.push(fromService(s, date));
  }
  out.push(...specialDates(events, now).filter(it => it.date! <= last));
  return out.sort(byWhen(t0));
}

// What happens on one date: that weekday's services plus events on (or spanning) that date.
export function onDate(services: Service[], events: ChurchEvent[], date: string): Item[] {
  const [y, m, d] = date.split("-").map(Number), dow = new Date(y, m - 1, d).getDay();
  return [
    ...services.filter(s => s.day === dow).map(s => fromService(s, date)),
    ...events.filter(e => e.date && e.date <= date && (e.end_date ?? e.date) >= date).map(fromEvent),
  ].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
}
