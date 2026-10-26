import type { Lang, Strings } from "../i18n";
import type { Place, Service } from "../lib/types";
import { fmtTime, serviceKey, upcoming } from "../lib/time";
import { copticParts, fastOn, feastsAround, iso, daysBetween } from "../lib/coptic";
import { Icon, mapsLinks, placeName, telHref } from "./bits";
import { StatusChips, Synaxarium } from "./Feasts";

type Occ = { s: Service; date: Date; inDays: number };
interface Props {
  t: Strings; lang: Lang; places: Map<string, Place>; services: Service[];
  saved: Set<string>; toggleSave: (k: string) => void;
  nearest: Place[] | null; // places with services, closest first (when location is on)
  distanceOf: (p: Place) => string | null;
  onOpen: (id: string) => void; onLocate: () => void;
}

const loc = (lang: Lang) => (lang === "ar" ? "ar-EG" : "en-US");
const shortName = (p: Place, lang: Lang) => placeName(p, lang)
  .replace(/ (Coptic Orthodox )?(Church|Community)( \(.*\))?$/, "").replace(/^كنيسة /, "").replace(/ القبطية الأرثوذكسية$/, "");

export function TodayView({ t, lang, places, services, saved, toggleSave, nearest, distanceOf, onOpen, onLocate }: Props) {
  const now = new Date(), t0 = iso(now), p = copticParts(now);
  const when = (o: Occ) => (o.inDays === 0 ? t.today : o.inDays === 1 ? t.tomorrow : o.date.toLocaleDateString(loc(lang), { weekday: "short", month: "short", day: "numeric" }));
  const title = (s: Service) => (lang === "ar" && s.title_ar) || s.title_en;

  // Next service: at the closest church that has times, otherwise the soonest anywhere.
  let next: Occ | undefined, label = t.nextAny;
  if (nearest?.length) {
    const near = nearest[0];
    next = upcoming(services.filter(s => s.place_id === near.id), now)[0];
    if (next) label = t.nextNear(distanceOf(near) ?? "");
  }
  const all = upcoming(services, now);
  next ??= all[0];
  const nextPlace = next && places.get(next.s.place_id);
  const maps = nextPlace && mapsLinks(nextPlace);

  const cur = fastOn(t0);
  const feast = feastsAround(t0, 0, 2).find(f => f.kind === "major");
  const season = cur ? t.seasonNow(cur.name[lang]) : feast ? t.seasonFeast(feast.name[lang], daysBetween(t0, feast.date) === 0 ? t.today.toLowerCase() : new Date(feast.date + "T12:00").toLocaleDateString(loc(lang), { weekday: "long", month: "long", day: "numeric" })) : "";

  const mine = all.filter(o => saved.has(serviceKey(o.s))).filter((o, i, a) => a.findIndex(x => serviceKey(x.s) === serviceKey(o.s)) === i);
  const comingIds = nearest?.length ? new Set(nearest.slice(0, 5).map(x => x.id)) : null;
  const coming = all.filter(o => !comingIds || comingIds.has(o.s.place_id)).slice(0, 4);

  const row = (o: Occ) => {
    const pl = places.get(o.s.place_id);
    return (
      <button type="button" class="mrow" key={serviceKey(o.s) + o.inDays} onClick={() => onOpen(o.s.place_id)}>
        <span class="w"><b>{when(o)}</b><span class="num">{fmtTime(o.s.start, lang)}</span></span>
        <span><span class="t">{title(o.s)}</span><span class="s">{pl ? shortName(pl, lang) : ""}</span></span>
        <svg class="chev flip" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><path d="m6 3 5 5-5 5" /></svg>
      </button>
    );
  };
  const shareApp = async () => {
    try { if (navigator.share) await navigator.share({ title: t.appName, text: t.shareAppText, url: location.origin }); else await navigator.clipboard.writeText(location.origin); } catch { /* cancelled */ }
  };

  return (
    <main class="stack">
      <section class="hero">
        <div class="hero-d">{now.toLocaleDateString(loc(lang), { weekday: "long", month: "long", day: "numeric" })}</div>
        <div class="hero-c">{t.copticDate(p.day, t.copticMonths[p.month - 1], p.year)}</div>
        <StatusChips t={t} lang={lang} />
        <Synaxarium t={t} lang={lang} inHero />
        <small>{t.fastsNote}</small>
      </section>

      {next && nextPlace && <div class="nextcard">
        <button type="button" class="top" onClick={() => onOpen(nextPlace.id)}>
          <span class="lbl">{label}</span>
          <span class="big">{when(next)} · <span class="num">{fmtTime(next.s.start, lang)}</span></span>
          <span class="ttl">{title(next.s)}</span>
          <span class="s">{placeName(nextPlace, lang)}</span>
        </button>
        {season && <div class="seasonal">{season}</div>}
        {!nearest && <div class="hint"><button class="linkbtn" type="button" onClick={onLocate}>{t.useLocHint}</button></div>}
        <div class="bar">
          {maps && <a href={maps.google} target="_blank" rel="noopener noreferrer"><Icon name="nav" />{t.directions}</a>}
          {nextPlace.phone && <a href={telHref(nextPlace.phone)}><Icon name="phone" />{t.call}</a>}
          <button type="button" aria-pressed={saved.has(serviceKey(next.s))} onClick={() => toggleSave(serviceKey(next!.s))}>{saved.has(serviceKey(next.s)) ? "★ " + t.saved : "☆ " + t.save}</button>
        </div>
      </div>}

      <div class="sec-h"><h2>{t.myEvents}</h2></div>
      {mine.length ? <div class="mini">{mine.map(row)}</div> : <div class="tip">{t.saveTip}</div>}

      {coming.length > 0 && <>
        <div class="sec-h"><h2>{t.comingUp}</h2><a class="linkbtn" href="#/churches">{t.tabChurches}</a></div>
        <div class="mini">{coming.map(row)}</div>
      </>}

      <div class="center"><button class="btn" type="button" onClick={shareApp}><Icon name="share" />{t.shareApp}</button></div>
    </main>
  );
}
