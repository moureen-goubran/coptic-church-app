import { useState } from "preact/hooks";
import type { Lang, Strings } from "../i18n";
import type { Resource } from "../lib/types";
import { norm, stateName, stateNameIn, COUNTRY_NAMES } from "../lib/search";
import { store } from "../lib/store";
import { CorrectionForm } from "./CorrectionForm";
import { Icon } from "./bits";

interface Props { t: Strings; lang: Lang; resources: Resource[]; q: string; setQ: (q: string) => void;
  regions: (readonly [string, string[]])[]; homeRegion: string | null }

const title = (r: Resource, lang: Lang) => (lang === "ar" && r.title_ar) || r.title_en;
const body = (r: Resource, lang: Lang) => (lang === "ar" && r.body_ar) || r.body_en;
export const resourceHay = (r: Resource) => norm([r.title_en, r.title_ar, r.body_en, r.body_ar].join(" "));
// "New Jersey" or "United States"; nothing for help that works anywhere.
const regionChip = (r: Resource, lang: Lang) => (r.region === "ALL" ? null : r.region === "US" ? COUNTRY_NAMES.US[lang] : stateNameIn(r.region, lang));

// Coptic Welcome: everything a newcomer needs in one place, laid out like the demo.
export function WelcomeView({ t, lang, resources, q, setQ, regions, homeRegion }: Props) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  // Which state's help to show ("US-NJ"); "" shows everything. Starts from your location, kept on this phone.
  const [picked, setPicked] = useState<string | null>(() => store.get<string | null>("helpRegion", null));
  const setWhere = (v: string) => { setPicked(v); store.set("helpRegion", v); };
  const where = picked ?? homeRegion ?? "";
  const [country, st] = where ? where.split("-") : ["", ""];
  // Help that works everywhere, in the picked country, or in the picked state. Local help is listed first.
  // (Region "US" is the only country-wide tag; "CA" in a row means California, not Canada.)
  const fits = (r: Resource) => !where || r.region === "ALL" || (r.region === "US" && country === "US") || r.region === st;
  const local = (r: Resource) => (where && r.region === st ? 0 : r.region === "ALL" ? 2 : 1);
  const toks = norm(q).split(" ").filter(Boolean);
  const has = (h: string) => toks.every(x => h.includes(x));
  const hit = (...words: string[]) => !toks.length || has(norm(words.join(" ")));

  const links = resources.filter(r => r.kind === "link" && fits(r) && (!toks.length || has(resourceHay(r)))).sort((a, b) => local(a) - local(b));
  // Videos show up once at least one is recorded, so the tab doesn't open on a list of "Coming soon".
  const videos = resources.some(r => r.kind === "video" && r.url) ? resources.filter(r => r.kind === "video" && fits(r) && (!toks.length || has(resourceHay(r)))) : [];
  const placeName = where ? stateNameIn(st, lang) : "";
  const show = [
    links.length > 0 || (!!toks.length && hit(t.helpLinks, t.helpLinksSub)),
    videos.length > 0,
    hit(t.mhTitle, t.mhSub, t.crisisTitle, "988 crisis mental health therapist counseling psychiatrist معالج نفسي استشارة أزمة"),
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

      {acc(0, t.helpLinks, t.helpLinksSub, <div class="res">
        <label class="helpfor"><span class="muted small">{t.helpFor}</span>
          <select value={where} onChange={e => setWhere((e.target as HTMLSelectElement).value)}>
            <option value="">{t.helpEverywhere}</option>
            {regions.map(([c, list]) => (
              <optgroup label={COUNTRY_NAMES[c]?.[lang] ?? c} key={c}>
                {list.map(s => <option value={`${c}-${s}`} key={s}>{lang === "ar" ? stateNameIn(s, lang) : stateName(s, c)}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        {where && !links.some(r => r.region === st) && <p class="muted small">{t.helpNoLocal(placeName)}</p>}
        {links.map(r => (
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

      {acc(2, t.mhTitle, t.mhSub, <div class="res">
        <div class="item">
          <h4>{t.crisisTitle}</h4>
          <p>{t.crisisBody}</p>
          <div class="row"><a class="btn small primary" href="tel:988">{t.call} 988</a><a class="btn small" href="https://988lifeline.org" target="_blank" rel="noopener noreferrer">{t.crisisOpen}</a></div>
        </div>
        <div class="empty"><b>{t.comingSoon}</b><br />{t.mhEmpty}</div>
      </div>)}

      {acc(3, t.suggestTitle, t.suggestSub, <CorrectionForm placeId={null} t={t} lang={lang} intro={t.suggestIntro} label={t.suggestLabel} />)}
    </main>
  );
}
