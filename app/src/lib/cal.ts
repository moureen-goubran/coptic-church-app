// Calendar files and links. Everything is built on the phone; nothing is sent anywhere
// until the person taps a link. Times are "floating" (the phone's own time zone).
import { addDays } from "./coptic";

export interface CalEntry {
  title: string; date: string; endDate?: string | null; start?: string | null; end?: string | null;
  location?: string; details?: string;
}

const plusHour = (hm: string) => { const [h, m] = hm.split(":").map(Number); return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
const compact = (day: string, hm?: string | null) => day.replaceAll("-", "") + (hm ? "T" + hm.replace(":", "") + "00" : "");

// [start, end] in calendar form: whole days use the day after as the end; timed entries default to one hour.
function range(e: CalEntry): [string, string] {
  const last = e.endDate ?? e.date;
  if (!e.start) return [compact(e.date), compact(addDays(last, 1))];
  return [compact(e.date, e.start), compact(last, e.end ?? plusHour(e.start))];
}

const esc = (s: string) => s.replace(/[\\,;]/g, m => "\\" + m).replace(/\r?\n/g, "\\n");
export function icsText(e: CalEntry, now = new Date()): string {
  const [a, b] = range(e), timed = !!e.start;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//My Coptic Church//EN", "BEGIN:VEVENT",
    `UID:${a}-${e.title.replace(/\W+/g, "-").slice(0, 60)}@mycopticchurch`, `DTSTAMP:${now.toISOString().replace(/[-:]|\.\d+/g, "")}`,
    timed ? `DTSTART:${a}` : `DTSTART;VALUE=DATE:${a}`, timed ? `DTEND:${b}` : `DTEND;VALUE=DATE:${b}`,
    `SUMMARY:${esc(e.title)}`, ...(e.location ? [`LOCATION:${esc(e.location)}`] : []), ...(e.details ? [`DESCRIPTION:${esc(e.details)}`] : []),
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

// Opens the phone's calendar app (Apple Calendar, Outlook, and most Android calendars) with the entry.
export function downloadIcs(e: CalEntry) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([icsText(e)], { type: "text/calendar" }));
  a.download = `${compact(e.date)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function googleCalUrl(e: CalEntry): string {
  const [a, b] = range(e);
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${a}/${b}` });
  if (e.details) p.set("details", e.details);
  if (e.location) p.set("location", e.location);
  return "https://calendar.google.com/calendar/render?" + p.toString();
}
