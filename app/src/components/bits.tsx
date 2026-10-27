import { useEffect, useState } from "preact/hooks";
import type { Place } from "../lib/types";
import type { Lang } from "../i18n";
import { stateName, COUNTRY_NAMES, norm } from "../lib/search";

export const placeName = (p: Place, lang: Lang) => (lang === "ar" && p.name_ar) || p.name;
// "St. Mark" instead of "St. Mark Coptic Orthodox Church", for tight rows.
export const shortName = (p: Place, lang: Lang) => placeName(p, lang)
  .replace(/ (Coptic Orthodox )?(Church|Community)( \(.*\))?$/, "").replace(/^كنيسة /, "").replace(/ القبطية الأرثوذكسية$/, "");
// Each church keeps one color everywhere on the Events tab (the demo's four, then a fixed palette).
const CHURCH_COLORS: Record<string, string> = {
  "nj-jersey-city-st-mark-jersey-city": "#8a6414", "nj-jersey-city-st-george-st-shenouda": "#9b3b2e",
  "nj-bayonne-virgin-mary-st-john": "#4f6b3a", "nj-bayonne-st-abanoub-st-antonious": "#6f4a73",
};
const PALETTE = ["#8a6414", "#9b3b2e", "#4f6b3a", "#6f4a73", "#2f6b6b", "#a0522d", "#2f5a7a", "#9a4a6a"];
export const churchColor = (id: string) => CHURCH_COLORS[id] ?? PALETTE[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
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
  plus: "M12 5v14M5 12h14",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  nav: "M3 11l18-8-8 18-2-8-8-2z",
  share: "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  church: "M12 2v4M10 4h4M6 21V11l6-5 6 5v10M10 21v-5h4v5",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M12 14v4 M10 16h4",
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.6 9.5a2.5 2.5 0 1 1 3.3 2.4c-.6.3-.9.8-.9 1.4v.4 M12 16.6h.01",
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

// "Sort by" dropdown, the same on Churches, Events and Feasts & Fasts.
export function SortBy({ t, value, options, onChange }: { t: { sortBy: string }; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label class="sortby"><span>{t.sortBy}</span>
      <select value={value} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
        {options.map(([v, l]) => <option value={v} key={v}>{l}</option>)}
      </select>
    </label>
  );
}

// Pick-many filter, the same look as the Events filters: lists every option, a type-to-find box, and a check per choice.
// groups: [heading, [value, label][]]; the heading is left out when empty.
export function MultiDD({ label, groups, value, onChange, t }: {
  label: string; groups: [string, [string, string][]][]; value: string[]; onChange: (v: string[]) => void;
  t: { findIn: string; clear: string; done: string };
}) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box && !box.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, [open, box]);
  const labelOf = (v: string) => groups.flatMap(g => g[1]).find(o => o[0] === v)?.[1] ?? v;
  const toks = norm(find).split(" ").filter(Boolean);
  const shown = groups.map(([h, list]) => [h, list.filter(([, l]) => !toks.length || toks.every(x => norm(l).includes(x)))] as const).filter(g => g[1].length);
  const text = value.length ? `${label}: ${labelOf(value[0])}${value.length > 1 ? " +" + (value.length - 1) : ""}` : label;
  return (
    <div class="dd" ref={setBox}>
      <button class={"ddb" + (value.length ? " on" : "")} type="button" aria-expanded={open} onClick={() => { setOpen(!open); setFind(""); }}>
        <span>{text}</span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {open && <div class="pop-panel ddp">
        <input class="ddfind" type="search" placeholder={t.findIn} aria-label={t.findIn} value={find} autoFocus onInput={e => setFind((e.target as HTMLInputElement).value)} />
        {shown.map(([h, list]) => <div key={h}>
          {h && <p class="muted small">{h}</p>}
          {list.map(([v, l]) => <label class="opt" key={v}>
            <input type="checkbox" checked={value.includes(v)} onChange={() => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])} /><span>{l}</span>
          </label>)}
        </div>)}
        <div class="ddfoot">
          <button class="linkbtn" type="button" onClick={() => onChange([])}>{t.clear}</button>
          <button class="btn primary small" type="button" onClick={() => setOpen(false)}>{t.done}</button>
        </div>
      </div>}
    </div>
  );
}
