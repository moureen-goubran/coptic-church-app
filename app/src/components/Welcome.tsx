import { useState } from "preact/hooks";
import type { Lang, Strings } from "../i18n";
import type { Resource } from "../lib/types";
import { norm, stateNameIn, COUNTRY_NAMES } from "../lib/search";
import { CorrectionForm } from "./CorrectionForm";
import { Icon } from "./bits";

interface Props { t: Strings; lang: Lang; resources: Resource[]; q: string; setQ: (q: string) => void }

const title = (r: Resource, lang: Lang) => (lang === "ar" && r.title_ar) || r.title_en;
const body = (r: Resource, lang: Lang) => (lang === "ar" && r.body_ar) || r.body_en;
export const resourceHay = (r: Resource) => norm([r.title_en, r.title_ar, r.body_en, r.body_ar].join(" "));
// "New Jersey" or "United States"; nothing for help that works anywhere.
const regionChip = (r: Resource, lang: Lang) => (r.region === "ALL" ? null : r.region === "US" ? COUNTRY_NAMES.US[lang] : stateNameIn(r.region, lang));

// Coptic Welcome: everything a newcomer needs in one place, laid out like the demo.
export function WelcomeView({ t, lang, resources, q, setQ }: Props) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const toks = norm(q).split(" ").filter(Boolean);
  const has = (h: string) => toks.every(x => h.includes(x));
  const hit = (...words: string[]) => !toks.length || has(norm(words.join(" ")));

  const links = resources.filter(r => r.kind === "link" && (!toks.length || has(resourceHay(r))));
  const videos = resources.filter(r => r.kind === "video" && (!toks.length || has(resourceHay(r))));
  const show = [
    links.length > 0 || (!!toks.length && hit(t.helpLinks, t.helpLinksSub)),
    videos.length > 0 || (!!toks.length && hit(t.helpVideos, t.videosNote)),
    hit(t.mhTitle, t.mhSub, "mental health therapist counseling psychiatrist معالج نفسي استشارة"),
    hit(t.suggestTitle, t.suggestSub, "suggestion feedback idea اقتراح ملاحظات"),
  ];
  // A search opens every section with a match.
  const isOpen = (k: number) => (toks.length ? show[k] : !!open[k]);
  const acc = (k: number, head: string, sub: string, children: preact.ComponentChildren) => show[k] && (
    <details class="acc" open={isOpen(k)} onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== isOpen(k) && !toks.length) setOpen({ ...open, [k]: o }); }}>
      <summary><span>{head}<small>{sub}</small></span></summary>
      <div class="accbody">{isOpen(k) && children}</div>
    </details>
  );
  const chip = (r: Resource) => { const c = regionChip(r, lang); return c && <span class="chip plain">{c}</span>; };

  return (
    <main class="stack">
      <label class="search">
        <Icon name="search" />
        <input type="search" placeholder={t.qWelcome} aria-label={t.qWelcome} value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} enterKeyHint="search" />
      </label>
      {toks.length > 0 && !show.some(Boolean) && <div class="empty">{t.gsNone}</div>}

      {acc(0, t.helpLinks, t.helpLinksSub, <div class="res">{links.map(r => (
        <div class="item" key={r.id}>
          <h4>{title(r, lang)}</h4>
          {body(r, lang) && <p>{body(r, lang)}</p>}
          <div class="row">{r.url && <a class="btn small" href={r.url} target="_blank" rel="noopener noreferrer">{t.open}</a>}{chip(r)}</div>
        </div>
      ))}</div>)}

      {acc(1, t.helpVideos, t.videosNote, <div class="res">{videos.map(r => (
        <div class="item" key={r.id}>
          <h4>{title(r, lang)}</h4>
          <div class="row">{r.url ? <a class="btn small" href={r.url} target="_blank" rel="noopener noreferrer">{t.watch}</a> : <span class="chip warn">{t.comingSoon}</span>}{chip(r)}</div>
        </div>
      ))}</div>)}

      {acc(2, t.mhTitle, t.mhSub, <div class="empty"><b>{t.comingSoon}</b><br />{t.mhEmpty}</div>)}

      {acc(3, t.suggestTitle, t.suggestSub, <CorrectionForm placeId={null} t={t} lang={lang} intro={t.suggestIntro} label={t.suggestLabel} />)}
    </main>
  );
}
