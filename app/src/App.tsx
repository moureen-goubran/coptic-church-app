import { useEffect, useMemo, useState } from "preact/hooks";
import { STRINGS, type Lang } from "./i18n";
import type { Dataset, Place } from "./lib/types";
import { loadBuiltIn, loadLive } from "./lib/data";
import { matches, stateName, countryRank, COUNTRY_NAMES } from "./lib/search";
import { milesBetween } from "./lib/geo";
import { fmtDate } from "./lib/time";
import { store } from "./lib/store";
import { MapView } from "./components/MapView";
import { PlaceSheet } from "./components/PlaceSheet";
import { CorrectionForm } from "./components/CorrectionForm";
import { Icon, Logo, placeName, regionLine } from "./components/bits";
import { FeastStrip, FeastsView } from "./components/Feasts";

type Tab = "churches" | "feasts" | "about";
const SIZES = [0.875, 0.9375, 1.0625, 1.1875, 1.3125];
const PAGE = 40;

function readHash(): { tab: Tab; place: string | null } {
  const m = location.hash.match(/^#\/(place)\/([a-z0-9-]+)$/);
  if (m) return { tab: "churches", place: m[2] };
  return { tab: location.hash === "#/about" ? "about" : location.hash === "#/feasts" ? "feasts" : "churches", place: null };
}

export function App() {
  const [lang, setLang] = useState<Lang>(() => store.get("lang", navigator.language.startsWith("ar") ? "ar" : "en"));
  const [size, setSize] = useState<number>(() => store.get("size", 1));
  const [theme, setTheme] = useState<string>(() => store.get("theme", "system"));
  const [data, setData] = useState<Dataset | null>(null);
  const [route, setRoute] = useState(readHash);
  const [q, setQ] = useState("");
  const [stateF, setStateF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [pop, setPop] = useState<"loc" | "settings" | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [online, setOnline] = useState(navigator.onLine);
  const t = STRINGS[lang];

  useEffect(() => {
    loadBuiltIn().then(setData).catch(() => {});
    loadLive().then(d => d && setData(d));
    const onHash = () => setRoute(readHash());
    const net = () => setOnline(navigator.onLine);
    addEventListener("hashchange", onHash); addEventListener("online", net); addEventListener("offline", net);
    return () => { removeEventListener("hashchange", onHash); removeEventListener("online", net); removeEventListener("offline", net); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = t.appName; store.set("lang", lang);
  }, [lang]);
  useEffect(() => { document.documentElement.style.fontSize = SIZES[size] * 100 + "%"; store.set("size", size); }, [size]);
  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
    store.set("theme", theme);
  }, [theme]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".pop")) setPop(null); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  useEffect(() => setShown(PAGE), [q, stateF, typeF, userLoc]);

  // Filter options grouped by country: [country, [state codes]].
  const regions = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const p of data?.places ?? []) { if (!m.has(p.country)) m.set(p.country, new Set()); m.get(p.country)!.add(p.state); }
    return [...m].sort((a, b) => countryRank(a[0]).localeCompare(countryRank(b[0])))
      .map(([c, set]) => [c, [...set].sort((a, b) => stateName(a, c).localeCompare(stateName(b, c)))] as const);
  }, [data]);
  const types = useMemo(() => [...new Set(data?.places.map(p => p.type))], [data]);
  const servicesBy = useMemo(() => {
    const m = new Map<string, Dataset["services"]>();
    for (const s of data?.services ?? []) { if (!m.has(s.place_id)) m.set(s.place_id, []); m.get(s.place_id)!.push(s); }
    return m;
  }, [data]);
  const dist = (p: Place) => (userLoc && p.lat !== null && p.lng !== null ? milesBetween(userLoc, [p.lat, p.lng]) : null);

  const results = useMemo(() => {
    const list = (data?.places ?? []).filter(p => (!stateF || `${p.country}-${p.state}` === stateF) && (!typeF || p.type === typeF) && (!q || matches(p, q)));
    if (userLoc) return list.map(p => [p, dist(p) ?? Infinity] as const).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    return list.sort((a, b) => countryRank(a.country).localeCompare(countryRank(b.country)) || stateName(a.state, a.country).localeCompare(stateName(b.state, b.country)) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  }, [data, q, stateF, typeF, userLoc]);

  const go = (hash: string) => { if (location.hash !== hash) location.hash = hash; };
  const openPlace = (id: string) => go(`#/place/${id}`);
  const closePlace = () => (history.length > 1 && route.place ? history.back() : go("#/"));
  const selected = route.place ? data?.places.find(p => p.id === route.place) ?? null : null;

  const findMe = () => {
    if (!("geolocation" in navigator)) { setLocMsg(t.locNo); return; }
    setLocMsg(t.locating);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLoc([pos.coords.latitude, pos.coords.longitude]); setLocMsg(null); setPop(null); go("#/"); },
      () => setLocMsg(t.locNo),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };
  const fmtMi = (p: Place) => { const d = dist(p); return d === null ? null : (p.location_approx ? "~" : "") + t.mi(d); };

  return (
    <div class="wrap">
      <header class="top">
        <div class="brand"><Logo /><div><h1>{t.appName}</h1><p>{t.tagline}</p></div></div>
        <div class="topctl">
          <div class="pop">
            <button class={"ctlbtn" + (userLoc ? " on" : "")} type="button" aria-label={t.locTitle} aria-expanded={pop === "loc"} onClick={() => setPop(pop === "loc" ? null : "loc")}><Icon name="pin" /></button>
            {pop === "loc" && <div class="pop-panel">
              <h3>{t.locTitle}</h3>
              <p role="status">{locMsg ?? (userLoc ? t.locOn : t.locNone)}</p>
              <button class="menu-item" type="button" onClick={findMe}>{t.locUse}</button>
              {userLoc && <button class="menu-item" type="button" onClick={() => { setUserLoc(null); setPop(null); }}>{t.locClear}</button>}
            </div>}
          </div>
          <div class="pop">
            <button class="ctlbtn" type="button" aria-label={t.sizeTitle} aria-expanded={pop === "settings"} onClick={() => setPop(pop === "settings" ? null : "settings")}>Aa</button>
            {pop === "settings" && <div class="pop-panel">
              <h3>{t.sizeTitle}</h3>
              <div class="sizes">{SIZES.map((_, i) => <button type="button" key={i} aria-pressed={size === i} onClick={() => setSize(i)} class="num">{(i + 1).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</button>)}</div>
              <h3>{t.themeTitle}</h3>
              <div class="sizes three">{(["system", "light", "dark"] as const).map(k => <button type="button" key={k} aria-pressed={theme === k} onClick={() => setTheme(k)}>{t[`theme_${k}`]}</button>)}</div>
            </div>}
          </div>
          <button class="ctlbtn" type="button" lang={lang === "ar" ? "en" : "ar"} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t.langSwitch}</button>
        </div>
      </header>

      {!online && <div class="callout">{t.offline}</div>}

      <FeastStrip t={t} lang={lang} />

      <nav class="tabs" role="tablist">
        <button role="tab" type="button" aria-selected={route.tab === "churches"} onClick={() => go("#/")}><Icon name="church" />{t.tabChurches}</button>
        <button role="tab" type="button" aria-selected={route.tab === "feasts"} onClick={() => go("#/feasts")}><Icon name="calendar" />{t.tabFeasts}</button>
        <button role="tab" type="button" aria-selected={route.tab === "about"} onClick={() => go("#/about")}><Icon name="info" />{t.tabAbout}</button>
      </nav>

      {route.tab === "churches" && <main class="stack">
        <MapView places={results} selectedId={route.place} userLoc={userLoc} onSelect={openPlace} t={t} theme={theme} />
        <div class="searchrow">
          <label class="search">
            <Icon name="search" />
            <input type="search" placeholder={t.search} aria-label={t.search} value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
          </label>
          <button class={"btn" + (userLoc ? " primary" : "")} type="button" onClick={() => (userLoc ? setUserLoc(null) : findMe())}><Icon name="pin" />{t.nearMe}</button>
        </div>
        {locMsg && !pop && <p class="muted small" role="status">{locMsg}</p>}
        <div class="filters">
          <select value={stateF} onChange={e => setStateF((e.target as HTMLSelectElement).value)} aria-label={t.allStates}>
            <option value="">{t.allStates}</option>
            {regions.map(([c, list]) => (
              <optgroup label={COUNTRY_NAMES[c]?.[lang] ?? c} key={c}>
                {list.map(s => <option value={`${c}-${s}`} key={s}>{stateName(s, c)}</option>)}
              </optgroup>
            ))}
          </select>
          <select value={typeF} onChange={e => setTypeF((e.target as HTMLSelectElement).value)} aria-label={t.allTypes}>
            <option value="">{t.allTypes}</option>
            {types.map(k => <option value={k} key={k}>{t.types[k] ?? k}</option>)}
          </select>
          <span class="muted small count" role="status">{data ? t.results(results.length) : "…"}</span>
        </div>

        <div class="list">
          {data && results.length === 0 && <div class="empty">{t.noneFound}</div>}
          {results.slice(0, shown).map(p => {
            const svc = servicesBy.get(p.id);
            const mi = fmtMi(p);
            return (
              <button type="button" class="card pcard" key={p.id} onClick={() => openPlace(p.id)} data-kind={p.type}>
                <span class="pmain">
                  <b class="pname">{placeName(p, lang)}</b>
                  <span class="muted small">{regionLine(p, lang)}{p.type !== "church" && <> · {t.types[p.type]}</>}</span>
                </span>
                <span class="pside">
                  {mi && <span class="chip gold num">{mi}</span>}
                  {svc && <span class="chip ty-liturgy">{t.services}</span>}
                </span>
              </button>
            );
          })}
          {results.length > shown && <button class="btn" type="button" onClick={() => setShown(shown + PAGE * 3)}>{`+ ${results.length - shown}`}</button>}
        </div>
        {data && <p class="muted small">{t.updated(fmtDate(data.generated, lang))}</p>}
      </main>}

      {route.tab === "feasts" && <FeastsView t={t} lang={lang} />}

      {route.tab === "about" && <main class="stack">
        <section class="card prose">
          <h2>{t.aboutTitle}</h2>
          <p>{t.aboutBody}</p>
          <h3>{t.aboutInfoH}</h3>
          <p>{t.aboutInfo}</p>
          <h3 id="privacy">{t.privacyH}</h3>
          <ul>{t.privacy.map(x => <li>{x}</li>)}</ul>
        </section>
        <section class="card prose">
          <h2>{t.homeTitle}</h2>
          <h3>{t.homeIphone}</h3><ol>{t.homeStepsIphone.map(x => <li>{x}</li>)}</ol>
          <h3>{t.homeAndroid}</h3><ol>{t.homeStepsAndroid.map(x => <li>{x}</li>)}</ol>
        </section>
        <section class="card prose">
          <h2>{t.reportTitle}</h2>
          <CorrectionForm placeId={null} t={t} lang={lang} />
        </section>
      </main>}

      {selected && <PlaceSheet place={selected} services={servicesBy.get(selected.id) ?? []} t={t} lang={lang} distance={fmtMi(selected)} onClose={closePlace} />}
    </div>
  );
}
