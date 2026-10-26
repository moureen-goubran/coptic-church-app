import { useEffect, useRef, useState } from "preact/hooks";
import type { Clergy, Details, Link, Place, Service } from "../lib/types";
import type { Lang, Strings } from "../i18n";
import { fmtDate, fmtTime, nextService, serviceKey } from "../lib/time";
import { regionLine } from "./bits";
import { CorrectionForm } from "./CorrectionForm";
import { placeName, addressLine, telHref, mapsLinks, Icon, SocialIcon } from "./bits";
import { CalendarSubscribe, ChurchSections, churchBits, ext } from "./ChurchInfo";

interface Props {
  place: Place; services: Service[]; details: Details | null; clergy: Clergy[]; links: Link[];
  saved: Set<string>; toggleSave: (k: string) => void;
  t: Strings; lang: Lang; distance: string | null; onClose: () => void;
}

export function PlaceSheet({ place: p, services, details: d, clergy, links, saved, toggleSave, t, lang, distance, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFix, setShowFix] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; prev?.focus?.(); };
  }, []);

  const byDay = [0, 1, 2, 3, 4, 5, 6].map(d => services.filter(s => s.day === d).sort((a, b) => a.start.localeCompare(b.start))).map((list, d) => ({ d, list })).filter(x => x.list.length);
  const nx = nextService(services);
  const maps = mapsLinks(p);
  const { live, parking } = churchBits(d, links, lang);
  const share = async () => {
    const url = `${location.origin}/#/place/${p.id}`;
    try {
      if (navigator.share) await navigator.share({ title: placeName(p, lang), url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  };

  return (
    <div class="sheet-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" tabIndex={-1} ref={ref}>
        <button class="x" type="button" aria-label={t.close} onClick={onClose}><Icon name="x" /></button>
        {d?.logo && <div class={"cbanner" + (d.logo_dark ? " dark" : "")}><img src={d.logo} alt="" /></div>}
        <h2 id="sheet-h">{placeName(p, lang)}</h2>
        <div class="chips">
          <span class="chip">{t.types[p.type] ?? p.type}</span>
          <span class="chip plain">{regionLine(p, lang)}</span>
          {distance && <span class="chip gold num">{distance}</span>}
        </div>

        <div class="actions">
          {maps && <a class="btn primary" href={maps.google} target="_blank" rel="noopener noreferrer"><Icon name="nav" />{t.google}</a>}
          {maps && <a class="btn" href={maps.apple} target="_blank" rel="noopener noreferrer">{t.apple}</a>}
          {p.phone && <a class="btn" href={telHref(p.phone)}><Icon name="phone" />{t.call}</a>}
          {live && <a class="btn" href={live.url} {...ext}><SocialIcon kind="live" />{t.liveStream}</a>}
          <button class="btn" type="button" onClick={share}><Icon name="share" />{copied ? t.copied : t.share}</button>
        </div>

        <dl class="kv">
          <dt class="k">{t.address}</dt><dd>{addressLine(p) || t.notFound}</dd>
          <dt class="k">{t.phone}</dt><dd>{p.phone ? <a class="num" href={telHref(p.phone)}>{p.phone}</a> : t.notFound}</dd>
          <dt class="k">{t.website}</dt><dd>{p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer">{p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : t.notFound}</dd>
          {d?.email && <><dt class="k">{t.email}</dt><dd><a class="num" href={`mailto:${d.email}`}>{d.email}</a></dd></>}
          {parking && <><dt class="k">{t.parking}</dt><dd>{parking}</dd></>}
          {p.diocese && <><dt class="k">{t.diocese}</dt><dd>{p.diocese}</dd></>}
        </dl>

        <section>
          <h3 class="subh">{t.services}</h3>
          {byDay.length === 0 ? <p class="muted">{t.noSchedule}</p> : <>
            {nx && <p class="next"><b>{t.next}:</b> {nx.inDays === 0 ? t.today : nx.inDays === 1 ? t.tomorrow : t.days[nx.s.day]} · <span class="num">{fmtTime(nx.s.start, lang)}</span> · {lang === "ar" && nx.s.title_ar || nx.s.title_en}</p>}
            {byDay.map(({ d, list }) => (
              <div class="dayblock" key={d}>
                <h4>{t.days[d]}</h4>
                <ul class="svc">
                  {list.map((s, i) => (
                    <li key={i}>
                      <span class="num time">{fmtTime(s.start, lang)}{s.end ? `–${fmtTime(s.end, lang)}` : ""}</span>
                      <span>{lang === "ar" && s.title_ar || s.title_en}{(s.room_en || s.room_ar) && <small class="muted"> · {lang === "ar" && s.room_ar || s.room_en}</small>}</span>
                      <span class={`chip ty-${s.kind}`}>{t.kinds[s.kind]}</span>
                      <button type="button" class="star" aria-pressed={saved.has(serviceKey(s))} aria-label={saved.has(serviceKey(s)) ? t.saved : t.save} title={saved.has(serviceKey(s)) ? t.saved : t.save} onClick={() => toggleSave(serviceKey(s))}>{saved.has(serviceKey(s)) ? "★" : "☆"}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p class="note">{t.callFirst}</p>
          </>}
          <CalendarSubscribe details={d} links={links} t={t} lang={lang} />
        </section>

        <ChurchSections place={p} details={d} clergy={clergy} links={links} t={t} lang={lang} />

        {p.location_approx && <p class="note">{t.approxPin}</p>}
        <p class="note">
          {t.verification[p.verification] ?? p.verification}
          {p.last_verified && <> · {t.lastVerified} <span class="num">{fmtDate(p.last_verified, lang)}</span></>}
        </p>

        {showFix ? <CorrectionForm placeId={p.id} t={t} lang={lang} /> :
          <div><button class="linkbtn" type="button" onClick={() => setShowFix(true)}><Icon name="flag" />{t.report}</button></div>}
      </div>
    </div>
  );
}
