import type { Place } from "./types";

// Lowercase, strip accents and Arabic diacritics, unify common spellings so "st mark" finds "St. Mark".
export function norm(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "").toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/\bsaint\b/g, "st").replace(/\bsts\b/g, "st").replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico", VI: "U.S. Virgin Islands",
};
export const stateName = (code: string) => STATE_NAMES[code] ?? code;

const hayCache = new WeakMap<Place, string>();
function hay(p: Place): string {
  let h = hayCache.get(p);
  if (!h) {
    h = " " + norm([p.name, p.name_ar, p.city, p.city_ar, p.state, stateName(p.state), p.zip, p.diocese].filter(Boolean).join(" ")) + " ";
    hayCache.set(p, h);
  }
  return h;
}

// Every word typed must appear (as the start of a word) somewhere in the place's details.
export function matches(p: Place, query: string): boolean {
  const words = norm(query).replace(/\b(coptic|orthodox|church|كنيسه)\b/g, " ").split(" ").filter(Boolean);
  const h = hay(p);
  return words.every(w => h.includes(" " + w));
}
