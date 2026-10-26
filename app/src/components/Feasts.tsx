import { useEffect, useMemo, useState } from "preact/hooks";
import type { Lang, Strings } from "../i18n";
import {
  type About, type Fast, type Feast, ABOUT, addDays, commDates, fastAbout, commOn, COMMS, copticParts, daysBetween, fastOn, feastsAround,
  iso, isWedFriFast, parseIso, synaxUrl, upcomingFasts,
} from "../lib/coptic";
import { downloadIcs } from "../lib/cal";
import { store } from "../lib/store";
import { Icon, SortBy } from "./bits";
import { norm } from "../lib/search";

type P = { t: Strings; lang: Lang };
const loc = (lang: Lang) => (lang === "ar" ? "ar-EG" : "en-US");
const todayIso = () => iso(new Date());
const fmt = (day: string, lang: Lang, o: Intl.DateTimeFormatOptions) => parseIso(day).toLocaleDateString(loc(lang), o);
const sameYear = (day: string) => day.slice(0, 4) === todayIso().slice(0, 4);
const longDate = (day: string, lang: Lang) => fmt(day, lang, { weekday: "long", month: "long", day: "numeric", year: sameYear(day) ? undefined : "numeric" });
const rel = (t: Strings, n: number) => (n === 0 ? t.today.toLowerCase() : n > 0 ? t.inDays(n) : t.daysAgo(-n));
export const copticShort = (day: string, t: Strings) => { const p = copticParts(parseIso(day)); return t.copticShort(p.day, t.copticMonths[p.month - 1]); };

const Arrow = ({ d }: { d: string }) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>;
const PREV = "M10 3 5 8l5 5", NEXT = "m6 3 5 5-5 5", CLOSE = "M4 4l8 8M12 4l-8 8";
const CalIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 7h12M5 1.5v3M11 1.5v3" /></svg>;

const AddCal = ({ t, title, start, end }: { t: Strings; title: string; start: string; end: string }) =>
  <button class="btn small" type="button" onClick={e => { e.stopPropagation(); downloadIcs({ title, date: start, endDate: end }); }}><CalIcon />{t.addCal}</button>;

// Month grid used by the feast calendar and the Synaxarium day picker.
function MonthGrid({ t, lang, month, feasts, selected, onPick, coptic }: P & { month: string; feasts: Feast[]; selected: string; onPick: (d: string) => void; coptic?: boolean }) {
  const [y, m] = month.split("-").map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(), t0 = todayIso();
  const dows = lang === "ar" ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"] : t.days.map(d => d.slice(0, 2));
  const cells = [];
  for (let i = 1; i <= n; i++) {
    const day = `${month}-${String(i).padStart(2, "0")}`, fs = feasts.filter(f => f.date === day), comm = coptic && commOn(day);
    const cls = ["d", !coptic && fastOn(day) ? "fast" : "", day === t0 ? "today" : "", fs.length ? "has" : "", comm ? "comm" : "", day === selected ? "sel" : "", coptic ? "pick" : ""].join(" ");
    const label = fmt(day, lang, { month: "long", day: "numeric" }) + (coptic ? " · " + copticShort(day, t) : "") + (fs.length ? ": " + fs.map(f => f.name[lang]).join(", ") : "");
    const num = i.toLocaleString(loc(lang));
    cells.push(coptic || fs.length
      ? <button type="button" class={cls} aria-label={label} title={fs.map(f => f.name[lang]).join(" · ") || undefined} onClick={() => onPick(day)}>{num}{coptic && <small>{copticParts(parseIso(day)).day.toLocaleString(loc(lang))}</small>}</button>
      : <div class={cls}>{num}</div>);
  }
  return <div class="grid">
    {dows.map(d => <div class="dow">{d}</div>)}
    {Array.from({ length: first.getDay() }, () => <div />)}
    {cells}
  </div>;
}
const addMonth = (ym: string, k: number) => { const [y, m] = ym.split("-").map(Number); return iso(new Date(y, m - 1 + k, 1)).slice(0, 7); };

/* ---------- feast strip, above the tabs ---------- */
export function FeastStrip({ t, lang }: P) {
  const t0 = todayIso();
  const feasts = useMemo(() => feastsAround(t0, 400, 400), [t0]);
  const def = Math.max(0, feasts.findIndex(f => f.date >= t0 && f.kind !== "fast"));
  const [i, setI] = useState(def);
  const [cal, setCal] = useState(false);
  const [month, setMonth] = useState(feasts[def].date.slice(0, 7));
  const f = feasts[i], dd = daysBetween(t0, f.date);
  const note = i === def ? upcomingFasts(t0).find(x => x.feast.date === f.date) : null;
  const label = dd === 0 ? t.feastToday : i === def ? t.feastNext : dd < 0 ? t.feastPast : t.feastUp;
  const go = (k: number) => { setI(k); setMonth(feasts[k].date.slice(0, 7)); };
  useEffect(() => {
    if (!cal) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setCal(false);
    const click = (e: MouseEvent) => !(e.target as HTMLElement).closest(".feast") && setCal(false);
    addEventListener("keydown", key); document.addEventListener("click", click);
    return () => { removeEventListener("keydown", key); document.removeEventListener("click", click); };
  }, [cal]);
  return (
    <div class="feast">
      <button class="icobtn flip" type="button" aria-label={t.prevFeast} disabled={i === 0} onClick={() => go(i - 1)}><Arrow d={PREV} /></button>
      <div class="fbody" aria-live="polite">
        <span>{label}</span>
        <b>{f.name[lang]} · {fmt(f.date, lang, { month: "long", day: "numeric", year: sameYear(f.date) ? undefined : "numeric" })}</b>
        {dd !== 0 && <span class={"fchip " + (dd < 0 ? "past" : "soon")}>{rel(t, dd)}</span>}
        {note ? <span class="fnote">{t.fastStarts(note.name[lang], fmt(note.start, lang, { month: "long", day: "numeric" }))}</span> : <span class="fchip">{t.feastKinds[f.kind]}</span>}
        {i !== def && <button class="back" type="button" onClick={() => go(def)}>{t.backNext}</button>}
      </div>
      <button class="icobtn flip" type="button" aria-label={t.nextFeast} disabled={i === feasts.length - 1} onClick={() => go(i + 1)}><Arrow d={NEXT} /></button>
      <button class="icobtn" type="button" aria-label={t.openCal} aria-expanded={cal} onClick={() => { setMonth(f.date.slice(0, 7)); setCal(!cal); }}><CalIcon /></button>
      {cal && <div class="cal" role="dialog" aria-label={t.openCal}>
        <header>
          <button class="icobtn flip" type="button" aria-label={t.prevMonth} onClick={() => setMonth(addMonth(month, -1))}><Arrow d={PREV} /></button>
          <b>{parseIso(month + "-01").toLocaleDateString(loc(lang), { month: "long", year: "numeric" })}</b>
          <span class="row"><button class="icobtn flip" type="button" aria-label={t.nextMonth} onClick={() => setMonth(addMonth(month, 1))}><Arrow d={NEXT} /></button>
            <button class="icobtn" type="button" aria-label={t.closeCal} onClick={() => setCal(false)}><Arrow d={CLOSE} /></button></span>
        </header>
        <MonthGrid t={t} lang={lang} month={month} feasts={feasts} selected={f.date} onPick={d => { setI(feasts.findIndex(x => x.date === d)); setCal(false); }} />
        <div class="legend"><span><i style="background:var(--gold)" />{t.legFeast}</span><span><i style="background:var(--maroon-soft)" />{t.legFast}</span><span><i style="border:2px solid var(--maroon)" />{t.legToday}</span></div>
        <p class="calnote">{t.calNote}</p>
      </div>}
    </div>
  );
}

/* ---------- status chips: fasting today, current or next fast ---------- */
export function StatusChips({ t, lang }: P) {
  const t0 = todayIso(), cur = fastOn(t0);
  const out = [];
  if (cur || isWedFriFast(t0)) out.push(<span class="chip big">{t.fastingDay}</span>);
  if (cur) {
    out.push(<span class="chip big">{t.fastDay(cur.name[lang], daysBetween(cur.start, t0) + 1, daysBetween(cur.start, cur.end) + 1)}</span>);
    out.push(<span class="chip big plain">{t.fastEnds(fmt(cur.end, lang, { month: "short", day: "numeric" }))}</span>);
  } else {
    const nx = upcomingFasts(t0)[0];
    out.push(<span class="chip big gold">{t.fastStarts(nx.name[lang], rel(t, daysBetween(t0, nx.start)))}</span>);
  }
  return <div class="chips">{out}</div>;
}

// "Times often change during the Nativity Fast…", or near a major feast. Empty otherwise.
export function seasonLine(t: Strings, lang: Lang, t0 = todayIso()): string {
  const cur = fastOn(t0);
  if (cur) return t.seasonNow(cur.name[lang]);
  const feast = feastsAround(t0, 0, 2).find(f => f.kind === "major");
  return feast ? t.seasonFeast(feast.name[lang], daysBetween(t0, feast.date) === 0 ? t.today.toLowerCase() : longDate(feast.date, lang)) : "";
}

// "Next commemoration: Virgin Mary · Saturday, October 31"
function nextComm(t: Strings, lang: Lang, t0: string) {
  const [c, d] = COMMS.map(c => [c, commDates(c.day, addDays(t0, 1), 1)[0]] as const).sort((a, b) => a[1].localeCompare(b[1]))[0];
  return t.commNext(t.commName[c.key], fmt(d, lang, { weekday: "long", month: "long", day: "numeric" }));
}

/* ---------- Synaxarium: one day at a time, with a Coptic-date picker ---------- */
export function Synaxarium({ t, lang, inHero }: P & { inHero?: boolean }) {
  const t0 = todayIso();
  const [day, setDay] = useState(t0);
  const [cal, setCal] = useState(false);
  const [month, setMonth] = useState(t0.slice(0, 7));
  const feasts = useMemo(() => feastsAround(t0, 400, 400), [t0]);
  const cm = commOn(day), fe = feasts.filter(f => f.date === day), p = copticParts(parseIso(day));
  const move = (d: string) => { setDay(d); setMonth(d.slice(0, 7)); };
  const months = [...new Set([month + "-01", addDays(addMonth(month, 1) + "-01", -1)].map(d => t.copticMonths[copticParts(parseIso(d)).month - 1]))].join(" – ");
  return (
    <div class={inHero ? "synax in-hero" : "card synax"}>
      <div class="sx">
        <button class="sxbtn flip" type="button" aria-label={t.prevDay} onClick={() => move(addDays(day, -1))}><Arrow d={PREV} /></button>
        <div class="sxbody">
          <span class="sxdate">{t.synaxL} · {fmt(day, lang, { weekday: "short", month: "short", day: "numeric" })}</span>
          {!(inHero && day === t0) && <b class="sxcop">{t.copticDate(p.day, t.copticMonths[p.month - 1], p.year)}</b>}
          {cm && <b>{day === t0 ? t.commToday(t.commName[cm.key]) : cm.title[lang]}</b>}
          {!cm && day === t0 && <span>{nextComm(t, lang, t0)}</span>}
          {fe.map(f => <span>{f.name[lang]}</span>)}
          <span class="sxlinks">
            <a href={synaxUrl(day)} target="_blank" rel="noopener noreferrer">{day === t0 ? t.synaxToday : t.synaxDay}</a>
            {day !== t0 && <button type="button" onClick={() => move(t0)}>{t.backToday}</button>}
          </span>
        </div>
        <span class="row">
          <button class="sxbtn flip" type="button" aria-label={t.nextDay} onClick={() => move(addDays(day, 1))}><Arrow d={NEXT} /></button>
          <button class="sxbtn" type="button" aria-label={t.openCal} aria-expanded={cal} onClick={() => setCal(!cal)}><CalIcon /></button>
        </span>
      </div>
      {cal && <div class="cal sxcal" role="dialog" aria-label={t.openCal}>
        <header>
          <button class="icobtn flip" type="button" aria-label={t.prevMonth} onClick={() => setMonth(addMonth(month, -1))}><Arrow d={PREV} /></button>
          <span class="mid"><b>{parseIso(month + "-01").toLocaleDateString(loc(lang), { month: "long", year: "numeric" })}</b><br /><span class="muted small">{months}</span></span>
          <button class="icobtn flip" type="button" aria-label={t.nextMonth} onClick={() => setMonth(addMonth(month, 1))}><Arrow d={NEXT} /></button>
        </header>
        <MonthGrid t={t} lang={lang} month={month} feasts={feasts} selected={day} coptic onPick={d => { setDay(d); setCal(false); }} />
        <div class="legend"><span><i style="background:var(--maroon)" />{t.legComm}</span><span><i style="background:var(--gold)" />{t.legFeast}</span></div>
      </div>}
    </div>
  );
}

// Short background with a link to the trusted page it comes from, folded away until opened.
const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
function AboutText({ a, t, lang }: P & { a: About }) {
  return <>
    <p class="about">{a[lang]}</p>
    <a class="small" href={a.src} target="_blank" rel="noopener noreferrer">{t.aboutMore(host(a.src))}</a>
  </>;
}

function FastCard({ f, t, lang }: P & { f: Fast }) {
  const t0 = todayIso(), now = t0 >= f.start && t0 <= f.end;
  return (
    <div class={"card fastcard" + (now ? " now" : "")}>
      <div class="fhead"><h3>{f.name[lang]}</h3><span class={"chip" + (now ? "" : " gold")}>{now ? t.stNow : t.stSoon(rel(t, daysBetween(t0, f.start)))}</span></div>
      <div class="kv"><span class="k">{t.startsL}</span><b>{longDate(f.start, lang)}</b></div>
      <div class="kv"><span class="k">{t.endsL}</span><span>{longDate(f.end, lang)}</span></div>
      <div class="kv"><span class="k">{t.lengthL}</span><span>{t.nDays(daysBetween(f.start, f.end) + 1)}</span></div>
      <div class="kv"><span class="k">{t.endsWithL}</span><span>{f.feast[lang]} · {fmt(f.feast.date, lang, { month: "long", day: "numeric" })}</span></div>
      <details class="more"><summary>{t.aboutFast}</summary><AboutText a={fastAbout(f.key)} t={t} lang={lang} /></details>
      <div><AddCal t={t} title={f.name[lang]} start={f.start} end={f.end} /></div>
    </div>
  );
}

/* ---------- the Feasts & Fasts tab ---------- */
export function FeastsView({ t, lang }: P) {
  const now = new Date(), t0 = iso(now), p = copticParts(now);
  const fasts = useMemo(() => upcomingFasts(t0), [t0]);
  const [sort, setSortState] = useState<string>(() => store.get("feastSort", "date"));
  const setSort = (v: string) => { setSortState(v); store.set("feastSort", v); };
  const coll = (a: string, b: string) => a.localeCompare(b, lang === "ar" ? "ar" : "en");
  const RANK: Record<string, number> = { major: 0, holy: 1, fast: 2, minor: 3, other: 4 };
  const feasts = useMemo(() => {
    const list = feastsAround(t0, 60, 330);
    return sort === "name" ? list.sort((a, b) => coll(a.name[lang], b.name[lang])) : sort === "importance" ? list.sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.date.localeCompare(b.date)) : list;
  }, [t0, sort, lang]);
  // Search: live text plus searches kept as bubbles (Enter); a row shows if it matches the text and any bubble.
  const [q, setQ] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const toks = norm(q).split(" ").filter(Boolean), tterms = terms.map(x => norm(x).split(" ").filter(Boolean));
  const hit = (...words: string[]) => (h => (!toks.length || toks.every(x => h.includes(x))) && (!tterms.length || tterms.some(tk => tk.every(x => h.includes(x)))))(norm(words.join(" ")));
  const searching = toks.length > 0 || terms.length > 0;
  const keep = () => { const v = q.trim(); if (v && !terms.includes(v)) setTerms([...terms, v]); setQ(""); };
  const fastsSorted = (sort === "name" ? [...fasts].sort((a, b) => coll(a.name[lang], b.name[lang])) : fasts).filter(f => hit(f.name.en, f.name.ar, fastAbout(f.key).en, fastAbout(f.key).ar));
  const comms = COMMS.filter(c => hit(c.title.en, c.title.ar, t.commName[c.key]));
  const feastsShown = feasts.filter(f => hit(f.name.en, f.name.ar, t.feastKinds[f.kind], ABOUT[f.key].en, ABOUT[f.key].ar));
  return (
    <main class="stack">
      <section class="hero">
        <div class="hero-d">{now.toLocaleDateString(loc(lang), { weekday: "long", month: "long", day: "numeric" })}</div>
        <div class="hero-c">{t.copticDate(p.day, t.copticMonths[p.month - 1], p.year)}</div>
        <StatusChips t={t} lang={lang} />
        <Synaxarium t={t} lang={lang} inHero />
        <small>{t.fastsNote}</small>
        <details class="more"><summary>{t.aboutCal}</summary>
          <AboutText a={ABOUT.calendar} t={t} lang={lang} />
          <AboutText a={ABOUT.synaxarium} t={t} lang={lang} />
        </details>
      </section>
      <label class="search">
        <Icon name="search" />
        <input type="search" placeholder={t.qFeasts} aria-label={t.qFeasts} enterKeyHint="search" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); keep(); } }} />
      </label>
      {q.trim() && <p class="muted small hint">{t.qEnter}</p>}
      {terms.length > 0 && <div class="showing">
        <b>{t.showing}</b>
        {terms.map(x => <span class="chip" key={x}>“{x}”<button type="button" aria-label={`${t.removeF} ${x}`} onClick={() => setTerms(terms.filter(y => y !== x))}>✕</button></span>)}
        <button class="linkbtn" type="button" style={{ marginInlineStart: "auto" }} onClick={() => setTerms([])}>{t.clearAll}</button>
      </div>}
      {searching && !fastsSorted.length && !comms.length && !feastsShown.length && <div class="empty">{t.noEvents}</div>}
      <div class="sortrow"><span />
        <SortBy t={t} value={sort} onChange={setSort} options={[["date", t.sortSoonest], ["name", t.sortName], ["importance", t.sortImportance]]} /></div>

      {fastsSorted.length > 0 && <>
      <div class="sec-h"><h2>{t.fastsTitle}</h2></div>
      <div class="fastlist">{fastsSorted.map(f => <FastCard f={f} t={t} lang={lang} key={f.key} />)}</div>
      </>}
      {(!searching || hit(t.wedFriTitle, t.wedFriBody, ABOUT.wedFri.en, ABOUT.wedFri.ar)) && <div class="card fastcard"><h3 class="h3">{t.wedFriTitle}</h3><p class="muted small" style="margin:0">{t.wedFriBody}</p>
        <details class="more"><summary>{t.aboutWedFri}</summary><AboutText a={ABOUT.wedFri} t={t} lang={lang} /></details></div>}

      {comms.length > 0 && <>
      <div class="sec-h"><h2>{t.commTitle}</h2><a class="linkbtn" href={synaxUrl(t0)} target="_blank" rel="noopener noreferrer">{t.synaxToday}</a></div>
      <p class="muted small lead">{t.commNote}</p>
      <div class="fastlist">
        {comms.map(c => {
          const ds = commDates(c.day, t0, 3), name = t.commName[c.key];
          return (
            <div class="card commcard" key={c.key}>
              <div class="fhead"><h3>{name}</h3><span class={"chip" + (ds[0] === t0 ? "" : " gold")}>{ds[0] === t0 ? t.today : rel(t, daysBetween(t0, ds[0]))}</span></div>
              <div class="muted small">{t.commOn(c.day)}</div>
              <div class="kv"><span class="k">{t.nextDates}</span><span>{ds.map((d, k) => <>{k > 0 && <br />}{fmt(d, lang, { weekday: "short", month: "short", day: "numeric" })} <span class="muted">({copticShort(d, t)})</span></>)}</span></div>
              <details class="more"><summary>{t.aboutComm}</summary><AboutText a={ABOUT[c.key === "mary" ? "commMary" : "commMichael"]} t={t} lang={lang} /></details>
              <div><AddCal t={t} title={c.title[lang]} start={ds[0]} end={ds[0]} /></div>
            </div>
          );
        })}
      </div>
      </>}

      {feastsShown.length > 0 && <>
      <div class="sec-h"><h2>{t.feastsTitle}</h2></div>
      <p class="muted small lead">{t.feastsTap}</p>
      <div class="feastlist">
        {feastsShown.map(f => {
          const dd = daysBetween(t0, f.date);
          return (
            <details class={"feastrow" + (dd < 0 ? " past" : "")} key={f.date + f.name.en}>
              <summary>
                <span class="fd">{fmt(f.date, lang, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                <span>{f.name[lang]}</span>
                <span class={"chip" + (dd === 0 ? "" : " plain")}>{dd === 0 ? t.today : t.feastKinds[f.kind]}</span>
              </summary>
              <div class="fabout"><AboutText a={ABOUT[f.key]} t={t} lang={lang} /></div>
            </details>
          );
        })}
      </div>
      </>}
      <p class="muted small">{t.feastSource}</p>
    </main>
  );
}
