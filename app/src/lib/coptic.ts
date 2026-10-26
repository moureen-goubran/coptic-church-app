// Coptic calendar: dates, feasts, fasts, monthly commemorations, Synaxarium links.
// Everything is worked out for any year, so there is no list to update each year.
// Fixed feasts follow their Coptic date (so they move a day after a Coptic leap year);
// movable ones follow Coptic Easter. Checked against copticchurch.net for 2026 and 2027.

export type Bi = { en: string; ar: string };
export type FeastKind = "major" | "minor" | "fast" | "holy" | "other";
export type Feast = { date: string; kind: FeastKind; name: Bi };
export type Fast = { key: string; start: string; end: string; name: Bi; feast: Bi & { date: string } };

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a: string, b: string) => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 864e5);

// Coptic new year (1 Tout) is Sept 11, or Sept 12 when the next Gregorian year is a leap year.
const newYear = (y: number) => new Date(y, 8, (y + 1) % 4 === 0 ? 12 : 11);
export function copticParts(d: Date): { day: number; month: number; year: number } {
  const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let start = newYear(d.getFullYear()), year = d.getFullYear() - 283;
  if (day0 < start) { start = newYear(d.getFullYear() - 1); year--; }
  const n = Math.round((day0.getTime() - start.getTime()) / 864e5);
  return { day: (n % 30) + 1, month: Math.floor(n / 30) + 1, year };
}

// The Gregorian date in year `y` that falls on Coptic month/day.
function fromCoptic(y: number, month: number, day: number): string {
  for (let d = new Date(y, 0, 1); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
    const p = copticParts(d);
    if (p.month === month && p.day === day) return iso(d);
  }
  throw new Error(`no ${month}/${day} in ${y}`);
}

// Coptic (Julian) Easter, as a Gregorian date. Valid 1900-2099.
export function easter(y: number): string {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return addDays(`${y}-${pad(m)}-${pad(day)}`, 13);
}

const N = {
  nativity: { en: "Nativity", ar: "عيد الميلاد المجيد" },
  circumcision: { en: "Circumcision of our Lord", ar: "عيد الختان" },
  theophany: { en: "Theophany (Epiphany)", ar: "عيد الغطاس" },
  cana: { en: "Wedding at Cana", ar: "عرس قانا الجليل" },
  nineveh: { en: "Fast of Nineveh (Jonah's Fast)", ar: "صوم أهل نينوى (صوم يونان)" },
  temple: { en: "Entrance into the Temple", ar: "دخول السيد المسيح الهيكل" },
  lent: { en: "Great Lent begins", ar: "بداية الصوم الكبير" },
  palm: { en: "Palm Sunday", ar: "أحد الشعانين" },
  annunciation: { en: "Annunciation", ar: "عيد البشارة" },
  covenant: { en: "Covenant Thursday", ar: "خميس العهد" },
  goodFriday: { en: "Good Friday", ar: "الجمعة العظيمة" },
  easter: { en: "Feast of the Resurrection (Easter)", ar: "عيد القيامة المجيد" },
  thomas: { en: "Thomas Sunday", ar: "أحد توما" },
  ascension: { en: "Ascension", ar: "عيد الصعود" },
  pentecost: { en: "Pentecost", ar: "عيد العنصرة" },
  egypt: { en: "Entry of the Lord into Egypt", ar: "دخول السيد المسيح أرض مصر" },
  apostles: { en: "Feast of the Apostles", ar: "عيد الرسل" },
  maryFast: { en: "St. Mary's Fast begins", ar: "بداية صوم السيدة العذراء" },
  transfiguration: { en: "Transfiguration", ar: "عيد التجلي" },
  mary: { en: "Feast of St. Mary (Assumption)", ar: "عيد صعود جسد السيدة العذراء" },
  nativityFast: { en: "Nativity Fast begins", ar: "بداية صوم الميلاد" },
} satisfies Record<string, Bi>;

// Feasts and fast beginnings in Gregorian year y, in date order.
export function feastsFor(y: number): Feast[] {
  const e = easter(y), F = (date: string, kind: FeastKind, name: Bi): Feast => ({ date, kind, name });
  return [
    F(`${y}-01-07`, "major", N.nativity), // The Church keeps Nativity on January 7 every year.
    F(fromCoptic(y, 5, 6), "minor", N.circumcision),
    F(fromCoptic(y, 5, 11), "major", N.theophany),
    F(fromCoptic(y, 5, 13), "minor", N.cana),
    F(addDays(e, -69), "fast", N.nineveh),
    F(fromCoptic(y, 6, 8), "minor", N.temple),
    F(addDays(e, -55), "fast", N.lent),
    F(addDays(e, -7), "major", N.palm),
    F(fromCoptic(y, 7, 29), "major", N.annunciation),
    F(addDays(e, -3), "minor", N.covenant),
    F(addDays(e, -2), "holy", N.goodFriday),
    F(e, "major", N.easter),
    F(addDays(e, 7), "minor", N.thomas),
    F(addDays(e, 39), "major", N.ascension),
    F(addDays(e, 49), "major", N.pentecost),
    F(fromCoptic(y, 9, 24), "minor", N.egypt),
    F(`${y}-07-12`, "other", N.apostles),
    F(`${y}-08-07`, "fast", N.maryFast),
    F(fromCoptic(y, 12, 13), "minor", N.transfiguration),
    F(`${y}-08-22`, "other", N.mary),
    F(`${y}-11-25`, "fast", N.nativityFast), // 43 days, always ending the day before Nativity.
  ].sort((a, b) => a.date.localeCompare(b.date));
}

// The five fasting seasons that begin in Gregorian year y.
export function fastsFor(y: number): Fast[] {
  const e = easter(y), pent = addDays(e, 49);
  return [
    { key: "nineveh", start: addDays(e, -69), end: addDays(e, -67), name: { en: "Fast of Nineveh (Jonah's Fast)", ar: "صوم أهل نينوى (صوم يونان)" }, feast: { date: addDays(e, -66), en: "Jonah's Passover", ar: "فصح يونان" } },
    { key: "lent", start: addDays(e, -55), end: addDays(e, -1), name: { en: "Great Lent and Holy Week", ar: "الصوم الكبير وأسبوع الآلام" }, feast: { date: e, en: "Easter", ar: "عيد القيامة" } },
    { key: "apostles", start: addDays(pent, 1), end: `${y}-07-11`, name: { en: "Apostles' Fast", ar: "صوم الرسل" }, feast: { date: `${y}-07-12`, en: "Feast of the Apostles", ar: "عيد الرسل" } },
    { key: "mary", start: `${y}-08-07`, end: `${y}-08-21`, name: { en: "St. Mary's Fast", ar: "صوم السيدة العذراء" }, feast: { date: `${y}-08-22`, en: "Feast of St. Mary", ar: "عيد السيدة العذراء" } },
    { key: "nativity", start: `${y}-11-25`, end: `${y + 1}-01-06`, name: { en: "Nativity Fast", ar: "صوم الميلاد" }, feast: { date: `${y + 1}-01-07`, en: "Nativity", ar: "عيد الميلاد" } },
  ];
}

// Each fast's current or next season, soonest first.
export function upcomingFasts(today: string): Fast[] {
  const y = Number(today.slice(0, 4));
  const all = [...fastsFor(y - 1), ...fastsFor(y), ...fastsFor(y + 1)];
  return [...new Set(all.map(f => f.key))]
    .map(k => all.find(f => f.key === k && f.end >= today)!)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function feastsAround(today: string, back = 60, ahead = 365): Feast[] {
  const y = Number(today.slice(0, 4)), from = addDays(today, -back), to = addDays(today, ahead);
  return [y - 1, y, y + 1].flatMap(feastsFor).filter(f => f.date >= from && f.date <= to);
}

export const fastOn = (day: string) => {
  const y = Number(day.slice(0, 4));
  return [...fastsFor(y - 1), ...fastsFor(y)].find(f => day >= f.start && day <= f.end) ?? null;
};

// Wednesdays and Fridays are fasting days, except from Easter to Pentecost and on Nativity or Theophany.
export function isWedFriFast(day: string): boolean {
  const dow = parseIso(day).getDay();
  if (dow !== 3 && dow !== 5) return false;
  const y = Number(day.slice(0, 4)), e = easter(y);
  if (day >= e && day <= addDays(e, 49)) return false;
  return day !== `${y}-01-07` && day !== fromCoptic(y, 5, 11);
}

// Monthly commemorations: Archangel Michael on the 12th and the Virgin Mary on the 21st of each Coptic month.
export const COMMS = [
  { day: 21, key: "mary" as const, title: { en: "Monthly commemoration of the Virgin Mary", ar: "التذكار الشهري للسيدة العذراء" } },
  { day: 12, key: "michael" as const, title: { en: "Monthly commemoration of Archangel Michael", ar: "التذكار الشهري لرئيس الملائكة ميخائيل" } },
];
export const commOn = (day: string) => { const p = copticParts(parseIso(day)); return p.month <= 12 ? COMMS.find(c => c.day === p.day) ?? null : null; };
export function commDates(cDay: number, from: string, n: number): string[] {
  const out: string[] = [];
  for (let d = from; out.length < n; d = addDays(d, 1)) {
    const p = copticParts(parseIso(d));
    if (p.month <= 12 && p.day === cDay) out.push(d);
  }
  return out;
}

const SYNAX = [["01-toot", "tout"], ["02-babah", "baba"], ["03-hatoor", "hator"], ["04-keyahk", "kiahk"], ["05-topah", "toba"], ["06-amsheer", "amshir"], ["07-baramhat", "paramhat"], ["08-bermodah", "baramouda"], ["09-bashans", "pashans"], ["10-bawoonah", "paona"], ["11-abeeb", "epep"], ["12-mesraa", "mesra"], ["13-nasea", "nasie"]];
export function synaxUrl(day: string): string {
  const p = copticParts(parseIso(day)), [folder, sfx] = SYNAX[p.month - 1];
  return `https://st-takla.org/books/en/church/synaxarium/${folder}/${pad(p.day)}-${sfx}.html`;
}
