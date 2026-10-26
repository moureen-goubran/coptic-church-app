// Church details shared by the church card (Churches tab) and the church page (sheet).
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { Clergy, Details, Link, Place, Service } from "../lib/types";
import type { Lang, Strings } from "../i18n";
import { fmtDate, fmtTime, nextService } from "../lib/time";
import { placeName, cityName, addressLine, telHref, mapsLinks, Icon, SocialIcon } from "./bits";
import { stateName } from "../lib/search";
import { CorrectionForm } from "./CorrectionForm";

export const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const SOCIAL = ["facebook", "instagram", "youtube", "x", "tiktok", "other"];

export function churchBits(d: Details | null, links: Link[], lang: Lang) {
  const pick = (en: string | null | undefined, a: string | null | undefined) => (lang === "ar" && a) || en || a || "";
  const of = (k: string) => links.filter(l => l.kind === k);
  return {
    pick,
    live: of("live")[0], cal: of("calendar")[0], donate: of("donate"), forms: of("form"), clergyPages: of("clergy_page"),
    groups: of("group"), apps: of("app"), tours: of("tour"),
    social: links.filter(l => SOCIAL.includes(l.kind)),
    parking: pick(d?.parking_en, d?.parking_ar), clergyNote: pick(d?.clergy_note_en, d?.clergy_note_ar),
  };
}

type More = { place: Place; details: Details | null; clergy: Clergy[]; links: Link[]; t: Strings; lang: Lang };

// A collapsible section. Every church shows every section, like the demo; an empty one says "Not added yet".
function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return <details class="more"><summary>{title}</summary>{children}</details>;
}

export function CalendarSubscribe({ details, links, t, lang }: Omit<More, "place" | "clergy">) {
  const { cal } = churchBits(details, links, lang);
  const webcal = cal?.url.replace(/^https:/, "webcal:");
  return (
    <Section title={t.subscribe}>{cal ? <>
      <div class="chips">
        <a class="btn small" href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal!)}`} {...ext}>{t.subGoogle}</a>
        <a class="btn small" href={webcal}>{t.subApple}</a>
      </div>
      <p class="note">{t.subHint}</p>
    </> : <p class="missing">{t.notFound}</p>}</Section>
  );
}

// Follow, Groups, App, Clergy, Give, Forms, First visit, Tour video, in the demo's order.
export function ChurchSections({ place: p, details, clergy, links, t, lang }: More) {
  const { pick, social, donate, forms, groups, apps, tours, clergyPages, clergyNote } = churchBits(details, links, lang);
  const none = <p class="missing">{t.notFound}</p>;
  const buttons = (list: Link[], fallback: string) => <div class="chips">{list.map(l => <a class="btn small" href={l.url} {...ext}>{pick(l.label_en, l.label_ar) || fallback}</a>)}</div>;
  return <>
    <Section title={t.follow}>{social.length > 0
      ? <div class="social">{social.map(l => <a href={l.url} {...ext}><SocialIcon kind={l.kind} />{pick(l.label_en, l.label_ar) || t.social[l.kind]}</a>)}</div> : none}</Section>
    <Section title={t.groups}>{groups.length > 0 ? <>{buttons(groups, t.joinGroup)}<p class="note">{t.groupsNote}</p></> : none}</Section>
    <Section title={t.churchApp}>{apps.length > 0 ? buttons(apps, t.getApp) : none}</Section>
    <Section title={clergy.length ? t.clergyN(clergy.length) : t.clergy}>{clergy.length > 0 || clergyPages.length > 0 || clergyNote ? <>
      {clergy.length > 0 && <ul class="clergy">{clergy.map(c => (
        <li><span>{pick(c.name_en, c.name_ar)}</span>
          {c.phone && <a class="num" href={telHref(c.phone)}>{c.phone}</a>}
          {c.email && <a class="num" href={`mailto:${c.email}`}>{c.email}</a>}</li>
      ))}</ul>}
      {clergyNote && <p class="note">{clergyNote}</p>}
      {clergyPages.length > 0 && buttons(clergyPages, t.clergy)}
    </> : none}</Section>
    <Section title={t.give}>{donate.length > 0 ? buttons(donate, t.donateOnline) : none}</Section>
    {forms.length > 0 && <Section title={t.forms}>{buttons(forms, t.forms)}</Section>}
    {p.type === "church" && <Section title={t.firstVisit}><ul class="visit">{t.firstVisitTips.map(x => <li>{x}</li>)}</ul></Section>}
    <Section title={t.tour}>{tours.length > 0 ? buttons(tours, t.watchTour) : none}</Section>
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
// Card top border: one gold line on every card (look "J"); maroon is kept for Call.
const TYPE_COLOR: Record<string, string> = { church: "var(--accent-line)", monastery: "var(--accent-line)", convent: "var(--accent-line)" };

export function ChurchCard({ place: p, details: d, clergy, links, services, distance, active, t, lang, onOpen, onFocus }: CardProps) {
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<"report" | "claim" | null>(null);
  const { live, parking } = churchBits(d, links, lang);
  const nx = nextService(services);
  const addr = addressLine(p);
  const region = [cityName(p, lang), lang === "ar" ? p.state : stateName(p.state, p.country)].filter(Boolean).join(lang === "ar" ? "، " : ", ");
  const copy = async () => { try { await navigator.clipboard.writeText(p.phone!); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ } };
  return (
    <article class={"card ccard" + (active ? " active" : "")} style={{ "--cc": TYPE_COLOR[p.type] ?? "var(--accent-line)" }}
      onClick={e => !(e.target as HTMLElement).closest("a,button,summary,details,form") && onFocus()}>
      {d?.logo && <div class={"cbanner" + (d.logo_dark ? " dark" : "")}><img src={d.logo} alt="" loading="lazy" /></div>}
      <div>
        <div class="city">{region}{p.type !== "church" && <> · {t.types[p.type]}</>}{distance && <> · <span class="num">{distance}</span></>}</div>
        <h2>{placeName(p, lang)}</h2>
      </div>
      {services.length > 0 && nx && <button class="next" type="button" onClick={onOpen}>
        <small>{t.nextHere}</small>
        <b>{nx.inDays === 0 ? t.today : nx.inDays === 1 ? t.tomorrow : t.days[nx.s.day]} · <span class="num">{fmtTime(nx.s.start, lang)}</span></b>{lang === "ar" && nx.s.title_ar || nx.s.title_en}
      </button>}
      {(p.street || parking) && <div class="facts">
        {p.street && <div class="fact"><span class="k">{t.address}</span><span class="num">{addr}</span></div>}
        {parking && <div class="fact"><span class="k">{t.parking}</span><span>{parking}</span></div>}
      </div>}
      <div class="actions">
        {p.phone && <a class="btn primary" href={telHref(p.phone)}><Icon name="phone" />{t.call}</a>}
        <DirectionsMenu place={p} t={t} />
        {/* The next-service box already opens the schedule, so the button only shows when there is no box. */}
        {services.length > 0 ? !nx && <button class="btn" type="button" onClick={onOpen}><Icon name="clock" />{t.seeSchedule}</button>
          : p.website && <a class="btn" href={p.website} {...ext}><Icon name="globe" />{t.website}</a>}
        {live && <a class="btn icon" href={live.url} {...ext} aria-label={t.liveShort} title={t.liveShort}><SocialIcon kind="live" /></a>}
      </div>
      <div class="reportrow"><button class="linkbtn" type="button" aria-expanded={form === "report"} onClick={() => setForm(form === "report" ? null : "report")}><Icon name="flag" />{t.report}</button></div>
      {form === "report" && <CorrectionForm placeId={p.id} t={t} lang={lang} />}
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
          </div>
          <button class="linkbtn claim" type="button" aria-expanded={form === "claim"} onClick={() => setForm(form === "claim" ? null : "claim")}>{t.claim}</button>
          {form === "claim" && <CorrectionForm placeId={p.id} t={t} lang={lang} claim />}
        </div>
      </details>
    </article>
  );
}
