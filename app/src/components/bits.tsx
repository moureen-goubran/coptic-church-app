import type { Place } from "../lib/types";
import type { Lang } from "../i18n";
import { stateName, COUNTRY_NAMES } from "../lib/search";

export const placeName = (p: Place, lang: Lang) => (lang === "ar" && p.name_ar) || p.name;
export const cityName = (p: Place, lang: Lang) => (lang === "ar" && p.city_ar) || p.city;
// "Jersey City, New Jersey", or "Calgary, Alberta, Canada" outside the US.
export const regionLine = (p: Place, lang: Lang) =>
  [cityName(p, lang), lang === "ar" ? p.state : stateName(p.state, p.country), p.country !== "US" ? COUNTRY_NAMES[p.country]?.[lang] ?? p.country : null].filter(Boolean).join(lang === "ar" ? "، " : ", ");
export const addressLine = (p: Place) => [p.street, p.city, [p.state, p.zip].filter(Boolean).join(" "), p.country !== "US" ? COUNTRY_NAMES[p.country]?.en ?? p.country : null].filter(Boolean).join(", ");
export const telHref = (phone: string) => "tel:" + phone.replace(/[^\d+]/g, "");

export function mapsLinks(p: Place) {
  if (p.lat === null || p.lng === null) {
    const q = addressLine(p); if (!q) return null;
    return { google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, apple: `https://maps.apple.com/?daddr=${encodeURIComponent(q)}` };
  }
  // Exact pin: go to it. Otherwise let the maps app find the church by name and address.
  const dest = p.street || p.location_approx ? encodeURIComponent(`${p.name}, ${addressLine(p)}`) : `${p.lat},${p.lng}`;
  return { google: `https://www.google.com/maps/dir/?api=1&destination=${dest}`, apple: `https://maps.apple.com/?daddr=${dest}&ll=${p.lat},${p.lng}` };
}

const PATHS: Record<string, string> = {
  pin: "M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z M12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4",
  x: "M6 6l12 12M18 6L6 18",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  nav: "M3 11l18-8-8 18-2-8-8-2z",
  share: "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  church: "M12 2v4M10 4h4M6 21V11l6-5 6 5v10M10 21v-5h4v5",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M12 14v4 M10 16h4",
  info: "M12 8h.01M11 12h1v5h1 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
};
export function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><path d={PATHS[name]} /></svg>;
}
export function Logo() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="var(--gold)" stroke-width="2.4"><path d="M20 4v32M4 20h32" /><circle cx="20" cy="4" r="2.6" fill="var(--gold)" /><circle cx="20" cy="36" r="2.6" fill="var(--gold)" /><circle cx="4" cy="20" r="2.6" fill="var(--gold)" /><circle cx="36" cy="20" r="2.6" fill="var(--gold)" /><circle cx="20" cy="20" r="5" /></g></svg>;
}
