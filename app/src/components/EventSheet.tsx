import { useEffect, useRef, useState } from "preact/hooks";
import type { Lang, Strings } from "../i18n";
import type { Place } from "../lib/types";
import type { Item } from "../lib/events";
import { downloadIcs, googleCalUrl } from "../lib/cal";
import { Icon, addressLine, mapsLinks, placeName, telHref } from "./bits";
import { calEntry, fmt, itemTitle, shareText, timeRange } from "./Events";

interface Props {
  it: Item; place: Place | undefined; t: Strings; lang: Lang; distance: string | null;
  saved: Set<string>; toggleSave: (k: string) => void; onClose: () => void; onOpenPlace: (id: string) => void;
}

// One service or event: when, where, directions, save, calendar and share. The full church page is one tap away.
export function EventSheet({ it, place: p, t, lang, distance, saved, toggleSave, onClose, onOpenPlace }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; prev?.focus?.(); };
  }, []);

  const pick = (en: string | null, ar: string | null) => (lang === "ar" && ar) || en || "";
  const room = pick(it.room_en, it.room_ar);
  const maps = p && mapsLinks(p);
  const on = saved.has(it.key);
  const long = { weekday: "long", month: "long", day: "numeric" } as const;
  const when = !it.date ? t.undatedWhen
    : it.end_date && it.end_date !== it.date ? `${fmt(it.date, lang, long)} – ${fmt(it.end_date, lang, long)}`
    : `${fmt(it.date, lang, long)} · ${timeRange(it, t, lang)}`;
  const text = shareText(it, p, t, lang);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: itemTitle(it, lang), text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  };

  return (
    <div class="sheet-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div class="sheet evsheet" role="dialog" aria-modal="true" aria-labelledby="evsheet-h" tabIndex={-1} ref={ref}>
        <button class="x" type="button" aria-label={t.close} onClick={onClose}><Icon name="x" /></button>
        <div class="chips">
          <span class={`chip ty-${it.kind}`}>{t.kinds[it.kind] ?? it.kind}</span>
          {it.weekly !== null && <span class="chip plain">{t.every(t.days[it.weekly])}</span>}
        </div>
        <h2 id="evsheet-h">{itemTitle(it, lang)}</h2>
        <p class="evwhen">{when}</p>
        {p && <div class="evwhere">
          <b>{placeName(p, lang)}</b>
          {room && <span>{room}</span>}
          <span class="muted">{[addressLine(p), distance].filter(Boolean).join(" · ")}</span>
        </div>}

        <div class="actions">
          {maps && <a class="btn primary" href={maps.google} target="_blank" rel="noopener noreferrer"><Icon name="nav" />{t.directions}</a>}
          {p?.phone && <a class="btn" href={telHref(p.phone)}><Icon name="phone" />{t.call}</a>}
          <button class="btn" type="button" aria-pressed={on} onClick={() => toggleSave(it.key)}>{on ? "★ " + t.saved : "☆ " + t.save}</button>
        </div>
        {it.date && <div class="evcal">
          <span class="muted small">{t.addToCal}</span>
          <div class="actions">
            <button class="btn small" type="button" onClick={() => downloadIcs(calEntry(it, p, t, lang))}><Icon name="calendar" />{t.calAppleOutlook}</button>
            <a class="btn small" href={googleCalUrl(calEntry(it, p, t, lang))} target="_blank" rel="noopener noreferrer"><Icon name="calendar" />{t.calGoogle}</a>
            <button class="btn small" type="button" onClick={share}><Icon name="share" />{copied ? t.copiedShort : t.shareEvent}</button>
          </div>
        </div>}

        {p && <button class="linkbtn" type="button" onClick={() => onOpenPlace(p.id)}>{t.seeChurchInfo}</button>}
      </div>
    </div>
  );
}
