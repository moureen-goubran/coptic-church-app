import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Lang, Strings } from "../i18n";
import type { ChurchEvent, Clergy, Place, Resource, Service } from "../lib/types";
import { alsoOffered, fromService, nextDateFor, specialDates, type Item } from "../lib/events";
import { feastsAround, iso, parseIso, upcomingFasts } from "../lib/coptic";
import { matches, norm } from "../lib/search";
import { fmtTime } from "../lib/time";
import { Icon, churchColor, placeName, regionLine, shortName } from "./bits";
import { dayLabel, itemHay, itemTitle } from "./Events";
import { resourceHay } from "./Welcome";

interface Props {
  t: Strings; lang: Lang; places: Place[]; services: Service[]; events: ChurchEvent[]; clergy: Clergy[]; resources: Resource[];
  onClose: () => void; onOpenPlace: (id: string) => void; onGo: (tab: "churches" | "events" | "feasts" | "welcome", q: string) => void;
}
const LIMIT = 6;

// The search button at the top right: one box that looks through churches, events, feasts and fasts, and Coptic Welcome.
export function GlobalSearch({ t, lang, places, services, events, clergy, resources, onClose, onOpenPlace, onGo }: Props) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  const byId = useMemo(() => new Map(places.map(p => [p.id, p])), [places]);
  const priests = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clergy) m.set(c.place_id, (m.get(c.place_id) ?? "") + " " + c.name_en + " " + (c.name_ar ?? ""));
    return m;
  }, [clergy]);

  const toks = norm(q).split(" ").filter(Boolean);
  const has = (h: string) => toks.every(x => h.includes(x));
  const now = new Date(), t0 = iso(now);

  const churches = !toks.length ? [] : places.filter(p => matches(p, q) || has(norm(p.street ?? "")) || has(norm(priests.get(p.id) ?? "")));
  const items: Item[] = !toks.length ? [] : [
    ...services.map(s => fromService(s, nextDateFor(s.day, s.start, now))), ...specialDates(events, now), ...alsoOffered(events),
  ].filter(it => has(itemHay(it, byId.get(it.place_id), t)));
  const seasons = !toks.length ? [] : [
    ...upcomingFasts(t0).map(f => ({ key: "f" + f.key, name: f.name[lang], date: f.start, hay: f.name.en + " " + f.name.ar })),
    ...feastsAround(t0, 0, 365).map(f => ({ key: "d" + f.date + f.name.en, name: f.name[lang], date: f.date, hay: f.name.en + " " + f.name.ar })),
  ].filter(f => has(norm(f.hay)));
  const help = !toks.length ? [] : resources.filter(r => has(resourceHay(r)));

  const when = (it: Item) => (!it.date ? t.undatedWhen : it.weekly !== null ? `${t.days[it.weekly]} ${fmtTime(it.start!, lang)}`
    : `${dayLabel(t, lang, it.date, it.end_date)}${it.start ? " " + fmtTime(it.start, lang) : ""}`);
  const row = (key: string, color: string, title: string, sub: string, go: () => void) => (
    <button class="gsr" type="button" key={key} style={{ "--cc": color }} onClick={go}><span class="dot" /><span><b>{title}</b><small>{sub}</small></span></button>
  );
  const group = (title: string, n: number, rows: preact.ComponentChildren[], more?: () => void) => n > 0 && (
    <div class="gsg"><h4>{title} · {n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</h4>{rows.slice(0, LIMIT)}
      {more && n > LIMIT && <button class="gsmore" type="button" onClick={more}>{t.gsMore(n)}</button>}</div>
  );

  return (
    <div class="card gs" role="search">
      <div class="gsrow">
        <label class="search">
          <Icon name="search" />
          <input ref={input} type="search" placeholder={t.gsPh} aria-label={t.gsBtn} value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} enterKeyHint="search" />
        </label>
        <button class="btn" type="button" onClick={onClose}>{t.close}</button>
      </div>
      {!toks.length ? <p class="muted small" style={{ margin: 0 }}>{t.gsHint}</p>
        : !churches.length && !items.length && !seasons.length && !help.length ? <p class="muted small" style={{ margin: 0 }}>{t.gsNone}</p>
        : <>
          {group(t.tabChurches, churches.length, churches.map(p => row(p.id, churchColor(p.id), placeName(p, lang), regionLine(p, lang), () => onOpenPlace(p.id))), () => onGo("churches", q))}
          {group(t.tabEvents, items.length, items.map(it => { const p = byId.get(it.place_id);
            return row(it.key, churchColor(it.place_id), itemTitle(it, lang), `${p ? shortName(p, lang) : ""} · ${when(it)}`, () => onOpenPlace(it.place_id)); }), () => onGo("events", q))}
          {group(t.tabFeasts, seasons.length, seasons.map(f => row(f.key, "var(--gold)", f.name,
            parseIso(f.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }), () => onGo("feasts", ""))))}
          {group(t.tabWelcome, help.length, help.map(r => row(r.id, "var(--gold)", (lang === "ar" && r.title_ar) || r.title_en,
            (lang === "ar" && r.body_ar) || r.body_en || t.comingSoon, () => onGo("welcome", q))), () => onGo("welcome", q))}
        </>}
    </div>
  );
}
