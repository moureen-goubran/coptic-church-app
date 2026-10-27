import { useEffect, useMemo, useState } from "preact/hooks";
import type { Lang, Strings } from "../i18n";
import type { ChurchEvent, Place, Service } from "../lib/types";
import { type Item, KIND_ORDER, alsoOffered, fromService, nextDateFor, onDate, specialDates } from "../lib/events";
import { addDays, iso, parseIso } from "../lib/coptic";
import { downloadIcs, googleCalUrl, type CalEntry } from "../lib/cal";
import { fmtTime } from "../lib/time";
import { norm } from "../lib/search";
import { store } from "../lib/store";
import { Icon, SortBy, addressLine, churchColor, placeName, shortName } from "./bits";
import { seasonLine } from "./Feasts";
import { CorrectionForm } from "./CorrectionForm";
export { KIND_ORDER };

// terms: searches kept as filter bubbles (Enter in the search box); an item shows if it matches any of them.
export type EvFilters = { churches: string[]; kinds: string[]; days: number[]; date: string; terms: string[] };
export const NO_FILTERS: EvFilters = { churches: [], kinds: [], days: [], date: "", terms: [] };
type Grp = "day" | "church" | "type";
type DD = "churches" | "kinds" | "days" | "date";

const loc = (lang: Lang) => (lang === "ar" ? "ar-EG" : "en-US");
export const fmt = (day: string, lang: Lang, o: Intl.DateTimeFormatOptions) => parseIso(day).toLocaleDateString(loc(lang), o);
const pick = (lang: Lang, en: string | null, ar: string | null) => (lang === "ar" && ar) || en || "";
export const itemTitle = (it: Item, lang: Lang) => pick(lang, it.title_en, it.title_ar);

// "Today", "Tomorrow" or "Sun, Nov 1"; "Nov 1 – Nov 3" for events over several days.
export function dayLabel(t: Strings, lang: Lang, day: string, end?: string | null): string {
  const t0 = iso(new Date());
  const one = (d: string) => (d === t0 ? t.today : d === addDays(t0, 1) ? t.tomorrow : fmt(d, lang, { weekday: "short", month: "short", day: "numeric" }));
  return end && end !== day ? `${fmt(day, lang, { month: "short", day: "numeric" })} – ${fmt(end, lang, { month: "short", day: "numeric" })}` : one(day);
}
// "Suggest an Event" (home and the bottom of Events): a closed card that opens the form. The bot check only loads once
// it's opened. Suggestions are emailed to the owner and never shown in the app until checked and added by hand.
export function SuggestEvent({ t, lang, churches }: { t: Strings; lang: Lang; churches: Place[] }) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => [...churches].sort((a, b) => placeName(a, lang).localeCompare(placeName(b, lang), lang === "ar" ? "ar" : "en")), [churches, lang]);
  return (
    <details class="suggest" open={open} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary><Icon name="plus" /><span><b>{t.suggestEvent}</b><span class="muted small">{t.suggestEventSub}</span></span></summary>
      {open && <div class="suggest-body"><CorrectionForm placeId={null} t={t} lang={lang} churches={list} /></div>}
    </details>
  );
}

// Words a search can match: titles and rooms in both languages, the church, its city, the type and the day.
export const itemHay = (it: Item, p: Place | undefined, t: Strings) => norm([it.title_en, it.title_ar, it.room_en, it.room_ar, p?.name, p?.name_ar, p?.city,
  t.kinds[it.kind] ?? "", it.weekly !== null ? t.days[it.weekly] : ""].filter(Boolean).join(" "));
const timeRange = (it: Item, t: Strings, lang: Lang) => (it.start ? fmtTime(it.start, lang) + (it.end ? ` – ${fmtTime(it.end, lang)}` : "") : t.allDay);

function whenText(it: Item, t: Strings, lang: Lang): string {
  if (!it.date) return t.undatedWhen;
  if (it.weekly !== null) return `${t.every(t.days[it.weekly])} · ${timeRange(it, t, lang)}`;
  const d = fmt(it.date, lang, { weekday: "long", month: "long", day: "numeric" });
  return it.end_date && it.end_date !== it.date ? `${d} – ${fmt(it.end_date, lang, { weekday: "long", month: "long", day: "numeric" })}` : `${d} · ${timeRange(it, t, lang)}`;
}
export function shareText(it: Item, p: Place | undefined, t: Strings, lang: Lang): string {
  const room = pick(lang, it.room_en, it.room_ar);
  return [itemTitle(it, lang), whenText(it, t, lang), p ? placeName(p, lang) + (room ? " · " + room : "") : "", p ? addressLine(p) : ""].filter(Boolean).join("\n");
}
const calEntry = (it: Item, p: Place | undefined, t: Strings, lang: Lang): CalEntry => ({
  title: itemTitle(it, lang), date: it.date!, endDate: it.end_date, start: it.start, end: it.end,
  location: p ? `${p.name}, ${addressLine(p)}` : undefined, details: [shareText(it, p, t, lang), t.eventsNote].join("\n\n"),
});

// Save, add to a calendar, or share. Built on the phone; nothing is sent until a link is tapped.
export function ItemMenu({ it, place, t, lang, saved, toggleSave }: { it: Item; place: Place | undefined; t: Strings; lang: Lang; saved: Set<string>; toggleSave: (k: string) => void }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(it, place, t, lang), on = saved.has(it.key);
  const ext = { target: "_blank", rel: "noopener noreferrer" };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } };
  return (
    <details class="evmenu" onClick={e => e.stopPropagation()}>
      <summary class="btn small">{t.saveShare}</summary>
      <div class="menu">
        <button type="button" class="menu-item" aria-pressed={on} onClick={() => toggleSave(it.key)}>{on ? t.savedMine : t.saveMine}</button>
        <hr />
        <button type="button" class="menu-item" onClick={() => downloadIcs(calEntry(it, place, t, lang))}>{t.icsCal}</button>
        <a class="menu-item" href={googleCalUrl(calEntry(it, place, t, lang))} {...ext}>{t.gcal}</a>
        <hr />
        {"share" in navigator && <button type="button" class="menu-item" onClick={() => navigator.share({ title: itemTitle(it, lang), text }).catch(() => {})}>{t.shareNative}</button>}
        <a class="menu-item" href={`https://wa.me/?text=${encodeURIComponent(text)}`} {...ext}>{t.whatsapp}</a>
        <a class="menu-item" href={`sms:?&body=${encodeURIComponent(text)}`}>{t.shareSms}</a>
        <a class="menu-item" href={`mailto:?subject=${encodeURIComponent(itemTitle(it, lang))}&body=${encodeURIComponent(text)}`}>{t.shareEmail}</a>
        <button type="button" class="menu-item" onClick={copy}>{copied ? t.copiedShort : t.copyDetails}</button>
      </div>
    </details>
  );
}

interface RowProps { it: Item; place: Place | undefined; t: Strings; lang: Lang; saved: Set<string>; toggleSave: (k: string) => void; onOpen: (id: string) => void; showDate?: boolean; extra?: string }
export function EvRow({ it, place, t, lang, saved, toggleSave, onOpen, showDate, extra }: RowProps) {
  const room = pick(lang, it.room_en, it.room_ar);
  const open = () => onOpen(it.place_id);
  return (
    <div class="ev" role="button" tabIndex={0} style={{ "--cc": churchColor(it.place_id) }} onClick={open}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } }}>
      {!it.date ? <div class="time">—</div>
        : showDate ? <div class="time">{dayLabel(t, lang, it.date, it.end_date)}<small>{it.start ? fmtTime(it.start, lang) : t.allDay}</small></div>
        : <div class="time num">{it.start ? fmtTime(it.start, lang) : t.allDay}{it.end && <small>– {fmtTime(it.end, lang)}</small>}</div>}
      <div>
        <h4>{itemTitle(it, lang)}</h4>
        <div class="sub"><span class="dot" />{place ? shortName(place, lang) : ""}{room && ` · ${room}`}{extra && ` · ${extra}`}</div>
        <div class="chips"><span class={`chip ty-${it.kind}`}>{t.kinds[it.kind] ?? it.kind}</span>{saved.has(it.key) && <span class="chip gold">{t.savedChip}</span>}</div>
      </div>
      <div class="side">{it.date && <ItemMenu it={it} place={place} t={t} lang={lang} saved={saved} toggleSave={toggleSave} />}</div>
    </div>
  );
}

const Caret = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>;

interface Props {
  t: Strings; lang: Lang; places: Map<string, Place>; services: Service[]; events: ChurchEvent[];
  saved: Set<string>; toggleSave: (k: string) => void; filters: EvFilters; setFilters: (f: EvFilters) => void;
  distanceOf: (p: Place) => string | null; onOpen: (id: string) => void; q: string; setQ: (q: string) => void;
}

export function EventsView({ t, lang, places, services, events, saved, toggleSave, filters: F, setFilters, distanceOf, onOpen, q, setQ }: Props) {
  const [grp, setGrpState] = useState<Grp>(() => store.get<Grp>("evGroup", "day"));
  const setGrp = (g: Grp) => { setGrpState(g); store.set("evGroup", g); };
  const [dd, setDd] = useState<DD | null>(null);
  const [find, setFind] = useState("");
  const [sort, setSortState] = useState<string>(() => store.get("evSort", "time"));
  const setSort = (v: string) => { setSortState(v); store.set("evSort", v); };
  const [openG, setOpenG] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".dd")) setDd(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setDd(null); };
    document.addEventListener("click", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, []);

  const now = new Date(), t0 = iso(now), todayDow = now.getDay();
  const dayOrder = [0, 1, 2, 3, 4, 5, 6].map(i => (todayDow + i) % 7);
  const num = (n: number) => n.toLocaleString(loc(lang));
  const P = (id: string) => places.get(id);

  // Only churches that have something listed, by name (with distance when location is on).
  const churchIds = useMemo(() => {
    const ids = [...new Set([...services, ...events].map(x => x.place_id))].filter(id => places.has(id));
    const name = (id: string) => shortName(places.get(id)!, lang);
    return ids.sort((a, b) => name(a).localeCompare(name(b), loc(lang)));
  }, [services, events, places, lang]);
  // The Church filter lists every church, not only the ones with something listed.
  const allIds = useMemo(() => {
    const name = (id: string) => shortName(places.get(id)!, lang);
    return [...places.keys()].sort((a, b) => name(a).localeCompare(name(b), loc(lang)));
  }, [places, lang]);
  const kinds = KIND_ORDER.filter(k => services.some(s => s.kind === k) || events.some(e => e.kind === k));

  const hay = (it: Item) => itemHay(it, P(it.place_id), t);
  const toks = norm(q).split(" ").filter(Boolean);
  const terms = (F.terms ?? []).map(x => norm(x).split(" ").filter(Boolean));
  const ok = (it: Item) => (!F.churches.length || F.churches.includes(it.place_id)) && (!F.kinds.length || F.kinds.includes(it.kind))
    && (h => (!toks.length || toks.every(x => h.includes(x))) && (!terms.length || terms.some(tk => tk.every(x => h.includes(x)))))(hay(it));

  // Sort by: soonest (each list's own time order), church name, or title.
  const coll = (a: string, b: string) => a.localeCompare(b, lang === "ar" ? "ar" : "en");
  const sorted = (list: Item[]) => sort === "church" ? [...list].sort((a, b) => coll(shortName(P(a.place_id)!, lang), shortName(P(b.place_id)!, lang)))
    : sort === "name" ? [...list].sort((a, b) => coll(itemTitle(a, lang), itemTitle(b, lang))) : list;
  const weekly = services.map(s => fromService(s, nextDateFor(s.day, s.start, now))).filter(ok);
  const wk = weekly.filter(it => !F.days.length || F.days.includes(it.weekly!));
  const special = sorted(specialDates(events, now).filter(ok));
  const undated = sorted(alsoOffered(events).filter(ok));
  const season = seasonLine(t, lang, t0);
  const row = (it: Item, o: { showDate?: boolean; extra?: string } = {}) =>
    <EvRow key={it.key} it={it} place={P(it.place_id)} t={t} lang={lang} saved={saved} toggleSave={toggleSave} onOpen={onOpen} {...o} />;

  const set = (f: Partial<EvFilters>) => setFilters({ ...F, ...f });
  const toggle = <K extends "churches" | "kinds" | "days">(k: K, v: EvFilters[K][number]) => {
    const cur = F[k] as (typeof v)[];
    const next = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
    set(k === "days" ? { days: next as number[], date: "" } : { [k]: next } as Partial<EvFilters>);
  };
  const label = (base: string, vals: string[]) => (vals.length ? `${base}: ${vals[0]}${vals.length > 1 ? " +" + num(vals.length - 1) : ""}` : base);
  const ddBtn = (k: DD, text: string, on: boolean) => (
    <button class={"ddb" + (on ? " on" : "")} type="button" aria-expanded={dd === k} onClick={() => { setDd(dd === k ? null : k); setFind(""); }}><span>{text}</span><Caret /></button>
  );
  const foot = (k: DD) => (
    <div class="ddfoot">
      <button class="linkbtn" type="button" onClick={() => set(k === "date" ? { date: "" } : { [k]: [] })}>{t.clear}</button>
      <button class="btn primary small" type="button" onClick={() => setDd(null)}>{t.done}</button>
    </div>
  );
  const opt = (checked: boolean, onChange: () => void, color: string, text: string, side?: string | null) => (
    <label class="opt"><input type="checkbox" checked={checked} onChange={onChange} /><span class="dot" style={{ "--cc": color }} /><span>{text}</span>{side && <small class="muted num">{side}</small>}</label>
  );

  // Type-to-find box at the top of a filter list.
  const findToks = norm(find).split(" ").filter(Boolean);
  const found = (...words: (string | null | undefined)[]) => !findToks.length || (h => findToks.every(x => h.includes(x)))(norm(words.filter(Boolean).join(" ")));
  const findBox = <input class="ddfind" type="search" placeholder={t.findIn} aria-label={t.findIn} value={find} autoFocus onInput={e => setFind((e.target as HTMLInputElement).value)} />;
  const keep = () => { const v = q.trim(); if (v && !(F.terms ?? []).includes(v)) set({ terms: [...(F.terms ?? []), v] }); setQ(""); };

  const pills: [string, string, () => void][] = [
    ...(F.terms ?? []).map(x => [`“${x}”`, `q${x}`, () => set({ terms: F.terms.filter(y => y !== x) })] as [string, string, () => void]),
    ...F.churches.filter(id => places.has(id)).map(id => [shortName(P(id)!, lang), `c${id}`, () => toggle("churches", id)] as [string, string, () => void]),
    ...F.kinds.map(k => [t.kinds[k] ?? k, `k${k}`, () => toggle("kinds", k)] as [string, string, () => void]),
    ...dayOrder.filter(d => F.days.includes(d)).map(d => [t.days[d], `d${d}`, () => toggle("days", d)] as [string, string, () => void]),
    ...(F.date ? [[fmt(F.date, lang, { weekday: "short", month: "short", day: "numeric" }), "date", () => set({ date: "" })] as [string, string, () => void]] : []),
  ];

  // Weekly services grouped by day (today first), by church, or by type.
  const sortWk = (a: Item, b: Item) => ((a.weekly! - todayDow + 7) % 7) - ((b.weekly! - todayDow + 7) % 7) || a.start!.localeCompare(b.start!);
  const groups = (grp === "church"
    ? churchIds.map(id => ({ key: "c" + id, label: shortName(P(id)!, lang), color: churchColor(id), list: wk.filter(i => i.place_id === id).sort(sortWk), extra: true }))
    : grp === "type"
      ? kinds.map(k => ({ key: "t" + k, label: t.kinds[k] ?? k, color: `var(--ty-${k})`, list: wk.filter(i => i.kind === k).sort(sortWk), extra: true }))
      : dayOrder.map(d => ({ key: "d" + d, label: t.days[d], color: `var(--day${d})`, list: wk.filter(i => i.weekly === d).sort((a, b) => a.start!.localeCompare(b.start!)), extra: false }))
  ).filter(g => g.list.length).map(g => ({ ...g, list: sorted(g.list) }));
  const isOpen = (key: string, i: number) => (toks.length ? true : key in openG ? openG[key] : grp === "day" ? key === "d" + todayDow : i === 0);
  const allKeys = [...groups.map(g => g.key), ...(undated.length && !F.days.length ? ["u"] : [])];
  const anyOpen = allKeys.some((k, i) => (k === "u" ? openG.u ?? false : isOpen(k, i)));
  const grpBox = (key: string, open: boolean, head: preact.ComponentChildren, n: number, body: preact.ComponentChildren) => (
    <details class="grp" key={key} open={open} onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== open && !toks.length) setOpenG(s => ({ ...s, [key]: o })); }}>
      <summary>{head}<span class="gn num">{num(n)}</span></summary>
      {open && <div class="grpbody">{body}</div>}
    </details>
  );

  let main: preact.ComponentChildren;
  if (F.date) {
    const list = sorted(onDate(services, events, F.date).filter(ok));
    main = <div class="dayblock">
      <h3>{fmt(F.date, lang, { weekday: "long", month: "long", day: "numeric" })}{F.date === t0 && <span class="chip">{t.today}</span>}</h3>
      {list.length ? list.map(it => row(it)) : <div class="empty">{t.noEvents}</div>}
    </div>;
  } else {
    main = <>
      {groups.length === 1 ? <div class="dayblock"><h3><span class="dot" style={{ "--cc": groups[0].color }} />{groups[0].label}</h3>{groups[0].list.map(it => row(it, groups[0].extra ? { extra: t.days[it.weekly!] } : {}))}</div>
        : groups.map((g, i) => grpBox(g.key, isOpen(g.key, i), <><span class="dot" style={{ "--cc": g.color }} />{g.label}{g.key === "d" + todayDow && <span class="chip">{t.today}</span>}</>, g.list.length,
          g.list.map(it => row(it, g.extra ? { extra: t.days[it.weekly!] } : {}))))}
      {!groups.length && !special.length && !undated.length && <div class="empty">{t.noEvents}</div>}
      {undated.length > 0 && !F.days.length && grpBox("u", toks.length ? true : openG.u ?? false, <>{t.alsoOffered}</>, undated.length, undated.map(it => row(it)))}
    </>;
  }

  return (
    <main class="stack">
      <div class="fbar">
        <div class="dd">
          {ddBtn("churches", label(t.ddChurch, F.churches.filter(id => places.has(id)).map(id => shortName(P(id)!, lang))), F.churches.length > 0)}
          {dd === "churches" && <div class="pop-panel ddp">
            {findBox}
            {allIds.filter(id => { const p = P(id)!; return found(placeName(p, "en"), placeName(p, "ar"), p.city, p.state); })
              .map(id => { const p = P(id)!; return opt(F.churches.includes(id), () => toggle("churches", id), churchColor(id), shortName(p, lang),
                [lang === "ar" && p.city_ar || p.city, p.state, distanceOf(p)].filter(Boolean).join(" · ")); })}
            {foot("churches")}
          </div>}
        </div>
        <div class="dd">
          {ddBtn("kinds", label(t.ddType, F.kinds.map(k => t.kinds[k] ?? k)), F.kinds.length > 0)}
          {dd === "kinds" && <div class="pop-panel ddp">{findBox}{kinds.filter(k => found(t.kinds[k], k)).map(k => opt(F.kinds.includes(k), () => toggle("kinds", k), `var(--ty-${k})`, t.kinds[k] ?? k))}{foot("kinds")}</div>}
        </div>
        <div class="dd">
          {ddBtn("days", label(t.ddDay, dayOrder.filter(d => F.days.includes(d)).map(d => new Date(2026, 0, 4 + d).toLocaleDateString(loc(lang), { weekday: "short" }))), F.days.length > 0)}
          {dd === "days" && <div class="pop-panel ddp">{findBox}{dayOrder.filter(d => found(t.days[d])).map(d => opt(F.days.includes(d), () => toggle("days", d), `var(--day${d})`, t.days[d]))}{foot("days")}</div>}
        </div>
        <div class="dd">
          {ddBtn("date", F.date ? `${t.ddDate}: ${fmt(F.date, lang, { month: "short", day: "numeric" })}` : t.ddDate, !!F.date)}
          {dd === "date" && <div class="pop-panel ddp">
            <p>{t.anyDate}</p>
            <input type="date" min={t0} value={F.date} aria-label={t.ddDate} onChange={e => { const v = (e.target as HTMLInputElement).value; set({ date: v, days: v ? [] : F.days }); }} />
            {foot("date")}
          </div>}
        </div>
        <label class="search">
          <Icon name="search" />
          <input type="search" placeholder={t.qEvents} aria-label={t.qEvents} title={t.qEnter} enterKeyHint="search" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); keep(); } }} />
        </label>
      </div>

      {q.trim() && <p class="muted small hint">{t.qEnter}</p>}
      <div class="showing">
        <b>{t.showing}</b>
        {pills.length ? <>
          {pills.map(([text, k, rm]) => <span class="chip" key={k}>{text}<button type="button" aria-label={`${t.removeF} ${text}`} onClick={rm}>✕</button></span>)}
          <button class="linkbtn" type="button" style={{ marginInlineStart: "auto" }} onClick={() => setFilters(NO_FILTERS)}>{t.clearAll}</button>
        </> : <span>{t.showingAll}</span>}
      </div>

      {!F.date && <div class="gbar">
        <span class="seg" role="group" aria-label={t.groupBy}><span>{t.groupBy}</span>
          {(["day", "church", "type"] as const).map(g => <button type="button" key={g} aria-pressed={grp === g} onClick={() => { setGrp(g); setOpenG({}); }}>{t[({ day: "gDay", church: "gChurch", type: "gType" } as const)[g]]}</button>)}
        </span>
        <SortBy t={t} value={sort} onChange={setSort} options={[["time", t.sortSoonest], ["church", t.sortChurch], ["name", t.sortName]]} />
        {!toks.length && allKeys.length > 1 && <button class="linkbtn" type="button" onClick={() => setOpenG(Object.fromEntries(allKeys.map(k => [k, !anyOpen])))}>{anyOpen ? t.collapseAll : t.expandAll}</button>}
      </div>}
      {season && <div class="seasonal solo">{season}</div>}
      <div class="callout">{t.eventsNote}</div>

      {special.length > 0 && !F.date && !F.days.length && grpBox("s", toks.length ? true : openG.s ?? true, <>{t.specialTitle}</>, special.length,
        <div class="upcoming">{special.map(it => {
          const p = P(it.place_id);
          return (
            <div class="up" key={it.key} role="button" tabIndex={0} style={{ "--cc": churchColor(it.place_id) }} onClick={() => onOpen(it.place_id)}
              onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpen(it.place_id); } }}>
              <span class="when">{dayLabel(t, lang, it.date!, it.end_date)} · <span class="num">{it.start ? fmtTime(it.start, lang) : t.allDay}</span></span>
              <b>{itemTitle(it, lang)}</b>
              <span class="muted small">{p ? shortName(p, lang) : ""}</span>
              <div class="chips"><span class={`chip ty-${it.kind}`}>{t.kinds[it.kind] ?? it.kind}</span>{saved.has(it.key) && <span class="chip gold">{t.savedChip}</span>}</div>
              <div><ItemMenu it={it} place={p} t={t} lang={lang} saved={saved} toggleSave={toggleSave} /></div>
            </div>
          );
        })}</div>)}


      <div class="evlist">{main}</div>

      <SuggestEvent t={t} lang={lang} churches={[...places.values()]} />
    </main>
  );
}
