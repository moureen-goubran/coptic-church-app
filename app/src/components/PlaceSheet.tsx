import { useEffect, useRef, useState } from "preact/hooks";
import type { Clergy, Details, Link, Place, Service } from "../lib/types";
import type { Lang, Strings } from "../i18n";
import { fmtDate, fmtTime, nextService } from "../lib/time";
import { regionLine } from "./bits";
import { CorrectionForm } from "./CorrectionForm";
import { placeName, addressLine, telHref, mapsLinks, Icon, SocialIcon } from "./bits";

interface Props {
  place: Place; services: Service[]; details: Details | null; clergy: Clergy[]; links: Link[];
  t: Strings; lang: Lang; distance: string | null; onClose: () => void;
}
const SOCIAL = ["facebook", "instagram", "youtube", "x", "tiktok", "other"];
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export function PlaceSheet({ place: p, services, details: d, clergy, links, t, lang, distance, onClose }: Props) {
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
  const ar = lang === "ar";
  const pick = (en: string | null | undefined, a: string | null | undefined) => (ar && a) || en || a || "";
  const of = (k: string) => links.filter(l => l.kind === k);
  const live = of("live")[0], cal = of("calendar")[0], donate = of("donate"), forms = of("form"), clergyPages = of("clergy_page");
  const social = links.filter(l => SOCIAL.includes(l.kind));
  const parking = pick(d?.parking_en, d?.parking_ar), clergyNote = pick(d?.clergy_note_en, d?.clergy_note_ar);
  const webcal = cal && cal.url.replace(/^https:/, "webcal:");
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
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p class="note">{t.callFirst}</p>
          </>}
          {cal && <details class="more">
            <summary>{t.subscribe}</summary>
            <div class="chips">
              <a class="btn small" href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal!)}`} {...ext}>{t.subGoogle}</a>
              <a class="btn small" href={webcal!}>{t.subApple}</a>
            </div>
            <p class="note">{t.subHint}</p>
          </details>}
        </section>

        {social.length > 0 && <details class="more">
          <summary>{t.follow}</summary>
          <div class="social">{social.map(l => <a href={l.url} {...ext}><SocialIcon kind={l.kind} />{pick(l.label_en, l.label_ar) || t.social[l.kind]}</a>)}</div>
        </details>}
        {donate.length > 0 && <details class="more">
          <summary>{t.give}</summary>
          <div class="chips">{donate.map(l => <a class="btn small" href={l.url} {...ext}>{pick(l.label_en, l.label_ar) || t.donateOnline}</a>)}</div>
        </details>}
        {forms.length > 0 && <details class="more">
          <summary>{t.forms}</summary>
          <div class="chips">{forms.map(l => <a class="btn small" href={l.url} {...ext}>{pick(l.label_en, l.label_ar)}</a>)}</div>
        </details>}
        {(clergy.length > 0 || clergyPages.length > 0) && <details class="more">
          <summary>{t.clergyN(clergy.length)}</summary>
          <ul class="clergy">{clergy.map(c => (
            <li><span>{pick(c.name_en, c.name_ar)}</span>
              {c.phone && <a class="num" href={telHref(c.phone)}>{c.phone}</a>}
              {c.email && <a class="num" href={`mailto:${c.email}`}>{c.email}</a>}</li>
          ))}</ul>
          {clergyNote && <p class="note">{clergyNote}</p>}
          {clergyPages.length > 0 && <div class="chips">{clergyPages.map(l => <a class="btn small" href={l.url} {...ext}>{pick(l.label_en, l.label_ar)}</a>)}</div>}
        </details>}
        {p.type === "church" && <details class="more">
          <summary>{t.firstVisit}</summary>
          <ul class="visit">{t.firstVisitTips.map(x => <li>{x}</li>)}</ul>
        </details>}

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
