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
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  info: "M12 8h.01M11 12h1v5h1 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
};
export function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><path d={PATHS[name]} /></svg>;
}
export function Logo() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="var(--gold)" stroke-width="2.4"><path d="M20 4v32M4 20h32" /><circle cx="20" cy="4" r="2.6" fill="var(--gold)" /><circle cx="20" cy="36" r="2.6" fill="var(--gold)" /><circle cx="4" cy="20" r="2.6" fill="var(--gold)" /><circle cx="36" cy="20" r="2.6" fill="var(--gold)" /><circle cx="20" cy="20" r="5" /></g></svg>;
}

// Small outline icons for church links (from the demo).
export function SocialIcon({ kind }: { kind: string }) {
  const svg = (children: preact.ComponentChildren) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16">{children}</svg>;
  switch (kind) {
    case "facebook": return svg(<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15 14.5c2.8-.4 6 1.2 6 4.5" /></>);
    case "instagram": return svg(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>);
    case "youtube": return svg(<><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5z" fill="currentColor" /></>);
    case "live": return svg(<><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></>);
    default: return svg(<path d="M4 5h16v11H9l-5 4z" />);
  }
}
