// Church details shared by the church card (Churches tab) and the church page (sheet).
import { useState } from "preact/hooks";
import type { Clergy, Details, Link, Place, Service } from "../lib/types";
import type { Lang, Strings } from "../i18n";
import { fmtDate, fmtTime, nextService } from "../lib/time";
import { placeName, cityName, addressLine, telHref, mapsLinks, Icon, SocialIcon } from "./bits";
import { stateName } from "../lib/search";

export const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const SOCIAL = ["facebook", "instagram", "youtube", "x", "tiktok", "other"];

export function churchBits(d: Details | null, links: Link[], lang: Lang) {
  const pick = (en: string | null | undefined, a: string | null | undefined) => (lang === "ar" && a) || en || a || "";
  const of = (k: string) => links.filter(l => l.kind === k);
  return {
    pick,
    live: of("live")[0], cal: of("calendar")[0], donate: of("donate"), forms: of("form"), clergyPages: of("clergy_page"),
    social: links.filter(l => SOCIAL.includes(l.kind)),
    parking: pick(d?.parking_en, d?.parking_ar), clergyNote: pick(d?.clergy_note_en, d?.clergy_note_ar),
  };
}

type More = { place: Place; details: Details | null; clergy: Clergy[]; links: Link[]; t: Strings; lang: Lang };

export function CalendarSubscribe({ details, links, t, lang }: Omit<More, "place" | "clergy">) {
  const { cal } = churchBits(details, links, lang);
  if (!cal) return null;
  const webcal = cal.url.replace(/^https:/, "webcal:");
  return (
    <details class="more">
      <summary>{t.subscribe}</summary>
      <div class="chips">
        <a class="btn small" href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`} {...ext}>{t.subGoogle}</a>
        <a class="btn small" href={webcal}>{t.subApple}</a>
      </div>
      <p class="note">{t.subHint}</p>
    </details>
  );
}

// Follow, Give, Church Forms, Clergy, First visit: each a collapsible section, shown only when there's something in it.
export function ChurchSections({ place: p, details, clergy, links, t, lang }: More) {
  const { pick, social, donate, forms, clergyPages, clergyNote } = churchBits(details, links, lang);
  return <>
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
  </>;
}

// Apple / Google Maps menu, like the demo's Directions button.
export function DirectionsMenu({ place, t }: { place: Place; t: Strings }) {
  const maps = mapsLinks(place);
  if (!maps) return null;
  return (
    <details class="evmenu">
      <summary class="btn"><Icon name="nav" />{t.directions}</summary>
      <div class="menu">
        <a class="menu-item" href={maps.apple} {...ext}>{t.apple}</a>
        <a class="menu-item" href={maps.google} {...ext}>{t.google}</a>
      </div>
    </details>
  );
}

interface CardProps extends More {
  services: Service[]; distance: string | null; active: boolean;
  onOpen: () => void; onFocus: () => void;
}
const TYPE_COLOR: Record<string, string> = { church: "var(--lapis)", monastery: "var(--gold)", convent: "var(--gold)" };

export function ChurchCard({ place: p, details: d, clergy, links, services, distance, active, t, lang, onOpen, onFocus }: CardProps) {
  const [copied, setCopied] = useState(false);
  const { live, parking } = churchBits(d, links, lang);
  const nx = nextService(services);
  const addr = addressLine(p);
  const region = [cityName(p, lang), lang === "ar" ? p.state : stateName(p.state, p.country)].filter(Boolean).join(lang === "ar" ? "، " : ", ");
  const copy = async () => { try { await navigator.clipboard.writeText(p.phone!); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ } };
  return (
    <article class={"card ccard" + (active ? " active" : "")} style={{ "--cc": TYPE_COLOR[p.type] ?? "var(--muted)" }}
      onClick={e => !(e.target as HTMLElement).closest("a,button,summary,details") && onFocus()}>
      {d?.logo && <div class={"cbanner" + (d.logo_dark ? " dark" : "")}><img src={d.logo} alt="" loading="lazy" /></div>}
      <div>
        <div class="city">{region}{p.type !== "church" && <> · {t.types[p.type]}</>}{distance && <> · <span class="num">{distance}</span></>}</div>
        <h2>{placeName(p, lang)}</h2>
      </div>
      {services.length > 0 && nx && <button class="next" type="button" onClick={onOpen}>
        <small>{t.nextHere}</small>
        <b>{nx.inDays === 0 ? t.today : nx.inDays === 1 ? t.tomorrow : t.days[nx.s.day]} · <span class="num">{fmtTime(nx.s.start, lang)}</span></b> · {lang === "ar" && nx.s.title_ar || nx.s.title_en}
      </button>}
      <div class="facts">
        <div class="fact"><span class="k">{t.address}</span>{p.street ? <span class="num">{addr}</span> : <span class="missing">{t.noStreet}</span>}</div>
        {parking && <div class="fact"><span class="k">{t.parking}</span><span>{parking}</span></div>}
      </div>
      <div class="actions">
        {p.phone && <a class="btn primary" href={telHref(p.phone)}><Icon name="phone" />{t.call}</a>}
        <DirectionsMenu place={p} t={t} />
        {services.length > 0 ? <button class="btn" type="button" onClick={onOpen}><Icon name="clock" />{t.seeSchedule}</button>
          : p.website && <a class="btn" href={p.website} {...ext}><Icon name="globe" />{t.website}</a>}
        {live && <a class="btn" href={live.url} {...ext}><SocialIcon kind="live" />{t.liveShort}</a>}
      </div>
      <details class="more">
        <summary>{t.moreInfo}</summary>
        <div class="morebody">
          <details class="more">
            <summary>{t.contactMore}</summary>
            <div class="facts">
              {p.phone && <div class="fact"><span class="k">{t.phone}</span><span class="num">{p.phone}</span><button class="btn small" type="button" onClick={copy}>{copied ? t.copiedShort : t.copy}</button></div>}
              {p.website && <div class="fact"><a class="btn small" href={p.website} {...ext}><Icon name="globe" />{t.visit}</a></div>}
              {d?.email && <div class="fact"><span class="k">{t.email}</span><a class="num" href={`mailto:${d.email}`}>{d.email}</a></div>}
              {p.diocese && <div class="fact"><span class="k">{t.diocese}</span><span>{p.diocese}</span></div>}
              {!p.phone && !p.website && !d?.email && <span class="missing">{t.notFound}</span>}
            </div>
          </details>
          <CalendarSubscribe details={d} links={links} t={t} lang={lang} />
          <ChurchSections place={p} details={d} clergy={clergy} links={links} t={t} lang={lang} />
          {services.length === 0 && <p class="note">{t.noSchedule}</p>}
          {p.location_approx && <p class="note">{t.approxPin}</p>}
          <div class="cfoot">
            <span class="chip plain">{t.verification[p.verification] ?? p.verification}</span>
            {p.last_verified && <span>{t.lastVerified} <span class="num">{fmtDate(p.last_verified, lang)}</span></span>}
            <button class="linkbtn" type="button" onClick={onOpen}><Icon name="flag" />{t.report}</button>
          </div>
        </div>
      </details>
    </article>
  );
}
