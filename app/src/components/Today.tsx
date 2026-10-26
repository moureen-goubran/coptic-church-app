import { useState } from "preact/hooks";
import type { Lang, Strings } from "../i18n";
import type { ChurchEvent, Place, Service } from "../lib/types";
import { fmtTime } from "../lib/time";
import { type Item, byWhen, fromService, nextDateFor, specialDates, upcomingItems } from "../lib/events";
import { iso } from "../lib/coptic";
import { Icon, mapsLinks, placeName, shortName, telHref } from "./bits";
import { seasonLine } from "./Feasts";
import { dayLabel, itemTitle } from "./Events";

interface Props {
  t: Strings; lang: Lang; places: Map<string, Place>; services: Service[]; events: ChurchEvent[];
  saved: Set<string>; toggleSave: (k: string) => void;
  nearest: Place[] | null; // places with services, closest first (when location is on)
  distanceOf: (p: Place) => string | null;
  onOpen: (id: string) => void; onLocate: () => void;
}


export function TodayView({ t, lang, places, services, events, saved, toggleSave, nearest, distanceOf, onOpen, onLocate }: Props) {
  const now = new Date(), t0 = iso(now);
  const when = (it: Item) => dayLabel(t, lang, it.date!, it.end_date);
  const time = (it: Item) => (it.start ? fmtTime(it.start, lang) : t.allDay);

  // Next service: at the closest church that has times, otherwise the soonest anywhere.
  // The next service or event: at the closest church that has times, otherwise the soonest anywhere.
  let next: Item | undefined, label = t.nextAny;
  if (nearest?.length) {
    const near = nearest[0];
    next = upcomingItems(services.filter(s => s.place_id === near.id), events.filter(e => e.place_id === near.id), now)[0];
    if (next) label = t.nextNear(distanceOf(near) ?? "");
  }
  const all = upcomingItems(services, events, now);
  next ??= all[0];
  const nextPlace = next && places.get(next.place_id);
  const maps = nextPlace && mapsLinks(nextPlace);
  const season = seasonLine(t, lang, t0);

  // Saved items: each weekly service once (its next date) and every saved special date still ahead.
  const mine = [...services.filter(s => saved.has(fromService(s, "").key)).map(s => fromService(s, nextDateFor(s.day, s.start, now))),
    ...specialDates(events, now).filter(it => saved.has(it.key))].sort(byWhen(t0));
  const comingIds = nearest?.length ? new Set(nearest.slice(0, 5).map(x => x.id)) : null;
  const coming = all.filter(it => !comingIds || comingIds.has(it.place_id)).slice(0, 4);

  const row = (it: Item) => {
    const pl = places.get(it.place_id);
    return (
      <button type="button" class="mrow" key={it.key + it.date} onClick={() => onOpen(it.place_id)}>
        <span class="w"><b>{when(it)}</b><span class="num">{time(it)}</span></span>
        <span><span class="t">{itemTitle(it, lang)}</span><span class="s">{pl ? shortName(pl, lang) : ""}</span></span>
        <svg class="chev flip" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><path d="m6 3 5 5-5 5" /></svg>
      </button>
    );
  };
  // No share sheet (most computers): copy the link and say so, so the button never seems to do nothing.
  const [copied, setCopied] = useState(false);
  const shareApp = async () => {
    try {
      if (navigator.share) await navigator.share({ title: t.appName, text: t.shareAppText, url: location.origin });
      else { await navigator.clipboard.writeText(location.origin); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  };

  return (
    <main class="stack">
      {next && nextPlace && <div class="nextcard">
        <button type="button" class="top" onClick={() => onOpen(nextPlace.id)}>
          <span class="lbl">{label}</span>
          <span class="big">{when(next)} · <span class="num">{time(next)}</span></span>
          <span class="ttl">{itemTitle(next, lang)}</span>
          <span class="s">{placeName(nextPlace, lang)}</span>
        </button>
        {season && <div class="seasonal">{season}</div>}
        {!nearest && <div class="hint"><button class="linkbtn" type="button" onClick={onLocate}>{t.useLocHint}</button></div>}
        <div class="bar">
          {maps && <a href={maps.google} target="_blank" rel="noopener noreferrer"><Icon name="nav" />{t.directions}</a>}
          {nextPlace.phone && <a href={telHref(nextPlace.phone)}><Icon name="phone" />{t.call}</a>}
          <button type="button" aria-pressed={saved.has(next.key)} onClick={() => toggleSave(next!.key)}>{saved.has(next.key) ? "★ " + t.saved : "☆ " + t.save}</button>
        </div>
      </div>}

      <div class="sec-h"><h2>{t.myEvents}</h2></div>
      {mine.length ? <div class="mini">{mine.map(row)}</div> : <div class="tip">{t.saveTip}</div>}

      {coming.length > 0 && <>
        <div class="sec-h"><h2>{t.comingUp}</h2><a class="linkbtn" href="#/events">{t.tabEvents}</a></div>
        <div class="mini">{coming.map(row)}</div>
      </>}

      <div class="center"><button class="btn" type="button" onClick={shareApp}><Icon name="share" />{copied ? t.copied : t.shareApp}</button></div>
    </main>
  );
}
