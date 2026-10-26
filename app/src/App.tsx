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
import { ChurchCard } from "./components/ChurchInfo";
import { CorrectionForm } from "./components/CorrectionForm";
import { Icon, Logo, SortBy, placeName, regionLine } from "./components/bits";
import { FeastStrip, FeastsView } from "./components/Feasts";
import { TodayView } from "./components/Today";
import { GlobalSearch } from "./components/GlobalSearch";
import { EventsView, NO_FILTERS, type EvFilters } from "./components/Events";

type Tab = "today" | "churches" | "events" | "feasts" | "about";
const SIZES = [0.875, 0.9375, 1.0625, 1.1875, 1.3125];
const PAGE = 40;

function readHash(): { tab: Tab; place: string | null } {
  const m = location.hash.match(/^#\/(place)\/([a-z0-9-]+)$/);
  if (m) return { tab: (sessionStorage.getItem("mcc.tab") as Tab | null) ?? "churches", place: m[2] };
  const tabs: Record<string, Tab> = { "#/churches": "churches", "#/events": "events", "#/feasts": "feasts", "#/about": "about" };
  return { tab: tabs[location.hash] ?? "today", place: null };
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
  // Your spot (from the phone or picked on the map). Kept on this phone only, never sent.
  const [userLoc, setUserLocState] = useState<[number, number] | null>(() => store.get<[number, number] | null>("loc", null));
  const [locHow, setLocHow] = useState<"gps" | "pick" | null>(() => store.get("locHow", null));
  const setUserLoc = (l: [number, number] | null, how: "gps" | "pick" | null = null) => {
    setUserLocState(l); setLocHow(l ? how : null); store.set("loc", l); store.set("locHow", l ? how : null);
  };
  const [picking, setPicking] = useState(false);
  const [mapView, setMapView] = useState<[[number, number], [number, number]] | null>(null);
  const [gsOpen, setGsOpen] = useState(false);
  const [evQ, setEvQ] = useState("");
  const [churchSort, setChurchSortState] = useState<string>(() => store.get("churchSort", "recommended"));
  const setChurchSort = (v: string) => { setChurchSortState(v); store.set("churchSort", v); };
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [pop, setPop] = useState<"loc" | "settings" | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [online, setOnline] = useState(navigator.onLine);
  const [saved, setSaved] = useState<Set<string>>(() => new Set(store.get<string[]>("saved", [])));
  const toggleSave = (k: string) => setSaved(prev => {
    const next = new Set(prev); if (next.has(k)) next.delete(k); else next.add(k);
    store.set("saved", [...next]); return next;
  });
  const [evFilters, setEvFiltersState] = useState<EvFilters>(() => ({ ...NO_FILTERS, ...store.get<Partial<EvFilters>>("evFilters", {}), date: "" }));
  const setEvFilters = (f: EvFilters) => { setEvFiltersState(f); store.set("evFilters", f); };
  const t = STRINGS[lang];

  useEffect(() => {
    loadBuiltIn().then(setData).catch(() => {});
    loadLive().then(d => d && setData(prev => ({ ...d, events: d.events ?? prev?.events ?? [] })));
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
    const close = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest(".pop")) setPop(null);
      document.querySelectorAll("details.evmenu[open]").forEach(d => { if (!d.contains(el) || el.closest(".menu-item")) d.removeAttribute("open"); });
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  useEffect(() => setShown(PAGE), [q, stateF, typeF, userLoc, mapView, churchSort]);
  // Typing a search or picking a filter takes over from the map area.
  useEffect(() => setMapView(null), [q, stateF, typeF]);

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
  const byPlace = <T extends { place_id: string }>(rows: T[] | undefined) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) { if (!m.has(r.place_id)) m.set(r.place_id, []); m.get(r.place_id)!.push(r); }
    return m;
  };
  const detailsBy = useMemo(() => new Map((data?.details ?? []).map(d => [d.place_id, d])), [data]);
  const clergyBy = useMemo(() => byPlace(data?.clergy), [data]);
  const linksBy = useMemo(() => byPlace(data?.links), [data]);
  const eventsBy = useMemo(() => byPlace(data?.events), [data]);
  const dist = (p: Place) => (userLoc && p.lat !== null && p.lng !== null ? milesBetween(userLoc, [p.lat, p.lng]) : null);

  // The list follows the map: after you drag or zoom it, only the places in view are listed, until you search or filter.
  const inView = (p: Place) => !mapView || (p.lat !== null && p.lng !== null && p.lng >= mapView[0][0] && p.lng <= mapView[1][0] && p.lat >= mapView[0][1] && p.lat <= mapView[1][1]);
  const results = useMemo(() => {
    const list = (data?.places ?? []).filter(p => (!stateF || `${p.country}-${p.state}` === stateF) && (!typeF || p.type === typeF) && (!q || matches(p, q)) && inView(p));
    const byState = (a: Place, b: Place) => countryRank(a.country).localeCompare(countryRank(b.country)) || stateName(a.state, a.country).localeCompare(stateName(b.state, b.country)) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
    const near = (a: Place, b: Place) => (dist(a) ?? Infinity) - (dist(b) ?? Infinity);
    const name = (a: Place, b: Place) => placeName(a, lang).localeCompare(placeName(b, lang), lang === "ar" ? "ar" : "en");
    const full = (a: Place, b: Place) => Number(servicesBy.has(b.id)) - Number(servicesBy.has(a.id));
    // "Recommended": closest first when your location is on, otherwise churches with full schedules first.
    const cmp = { recommended: userLoc ? near : (a: Place, b: Place) => full(a, b) || byState(a, b), near: userLoc ? near : byState, name, state: byState,
      verified: (a: Place, b: Place) => (b.last_verified ?? "").localeCompare(a.last_verified ?? "") || byState(a, b) }[churchSort] ?? byState;
    return list.sort(cmp);
  }, [data, q, stateF, typeF, userLoc, mapView, churchSort, lang]);
  const mapPlaces = useMemo(() => (data?.places ?? []).filter(p => (!stateF || `${p.country}-${p.state}` === stateF) && (!typeF || p.type === typeF) && (!q || matches(p, q))), [data, q, stateF, typeF]);

  const [focus, setFocus] = useState<string | null>(null);
  const card = (p: Place) => (
    <ChurchCard key={p.id} place={p} details={detailsBy.get(p.id) ?? null} clergy={clergyBy.get(p.id) ?? []} links={linksBy.get(p.id) ?? []}
      services={servicesBy.get(p.id) ?? []} distance={fmtMi(p)} active={focus === p.id} t={t} lang={lang}
      onOpen={() => openPlace(p.id)} onFocus={() => { setFocus(p.id); document.querySelector(".mapbox")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
  );
  const go = (hash: string) => { if (location.hash !== hash) location.hash = hash; };
  useEffect(() => { try { sessionStorage.setItem("mcc.tab", route.tab); } catch { /* private mode */ } }, [route.tab]);
  const placesById = useMemo(() => new Map((data?.places ?? []).map(p => [p.id, p])), [data]);
  const nearest = useMemo(() => (userLoc ? (data?.places ?? []).filter(p => servicesBy.has(p.id) && dist(p) !== null).sort((a, b) => dist(a)! - dist(b)!) : null), [data, userLoc]);
  const tabHash: Record<Tab, string> = { today: "#/", churches: "#/churches", events: "#/events", feasts: "#/feasts", about: "#/about" };
  const openPlace = (id: string) => go(`#/place/${id}`);
  const closePlace = () => (history.length > 1 && route.place ? history.back() : go(tabHash[route.tab]));
  const selected = route.place ? data?.places.find(p => p.id === route.place) ?? null : null;

  const findMe = () => {
    if (!("geolocation" in navigator)) { setLocMsg(t.locNo); return; }
    setLocMsg(t.locating);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLoc([pos.coords.latitude, pos.coords.longitude], "gps"); setLocMsg(null); setPicking(false); setPop(null); if (route.tab !== "today") go("#/churches"); },
      () => setLocMsg(t.locNo),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };
  const startPick = () => {
    setPop(null); setPicking(true); setLocMsg(null); go("#/churches");
    setTimeout(() => document.querySelector(".mapbox")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
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
              <p role="status">{locMsg ?? (userLoc ? (locHow === "pick" ? t.locPicked : t.locOn) : t.locNone)}</p>
              <button class="menu-item" type="button" onClick={findMe}>{t.locUse}</button>
              <button class="menu-item" type="button" onClick={startPick}>{t.locPick}</button>
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
          <button class={"ctlbtn" + (gsOpen ? " on" : "")} type="button" aria-label={t.gsBtn} aria-expanded={gsOpen} onClick={() => setGsOpen(!gsOpen)}><Icon name="search" /></button>
        </div>
      </header>

      {gsOpen && <GlobalSearch t={t} lang={lang} places={data?.places ?? []} services={data?.services ?? []} events={data?.events ?? []} clergy={data?.clergy ?? []}
        onClose={() => setGsOpen(false)} onOpenPlace={id => { setGsOpen(false); openPlace(id); }}
        onGo={(tab, text) => { setGsOpen(false); if (tab === "churches") setQ(text); if (tab === "events") setEvQ(text); go(tabHash[tab]); scrollTo({ top: 0 }); }} />}

      {!online && <div class="callout">{t.offline}</div>}

      <FeastStrip t={t} lang={lang} />

      <nav class="tabs" role="tablist">
        <button role="tab" type="button" aria-selected={route.tab === "today"} onClick={() => go("#/")}><Icon name="home" />{t.tabToday}</button>
        <button role="tab" type="button" aria-selected={route.tab === "churches"} onClick={() => go("#/churches")}><Icon name="church" />{t.tabChurches}</button>
        <button role="tab" type="button" aria-selected={route.tab === "events"} onClick={() => go("#/events")}><Icon name="clock" />{t.tabEvents}</button>
        <button role="tab" type="button" aria-selected={route.tab === "feasts"} onClick={() => go("#/feasts")}><Icon name="calendar" />{t.tabFeasts}</button>
        <button role="tab" type="button" aria-selected={route.tab === "about"} onClick={() => go("#/about")}><Icon name="info" />{t.tabAbout}</button>
      </nav>

      {route.tab === "today" && <TodayView t={t} lang={lang} places={placesById} services={data?.services ?? []} events={data?.events ?? []} saved={saved} toggleSave={toggleSave}
        nearest={nearest} distanceOf={fmtMi} onOpen={openPlace} onLocate={findMe} />}

      {route.tab === "churches" && <main class="stack">
        <MapView places={mapPlaces} onView={setMapView} picking={picking} onPickCancel={() => setPicking(false)}
          onPick={l => { setUserLoc(l, "pick"); setPicking(false); setLocMsg(null); }} selectedId={route.place ?? focus} userLoc={userLoc} onSelect={openPlace} t={t} theme={theme} />
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
          <SortBy t={t} value={churchSort} onChange={v => { setChurchSort(v); if (v === "near" && !userLoc) findMe(); }}
            options={[["recommended", t.sortRecommended], ["near", t.sortNear], ["name", t.sortName], ["state", t.sortState], ["verified", t.sortVerified]]} />
          <span class="muted small count" role="status">{data ? t.results(results.length) : "…"}</span>
        </div>
        {mapView && !q && !stateF && !typeF && <div class="showing"><span>{t.inMapArea(results.length)}</span>
          <button class="linkbtn" type="button" style={{ marginInlineStart: "auto" }} onClick={() => setMapView(null)}>{t.fullMap}</button></div>}

        {data && results.length === 0 && <div class="empty">{t.noneFound}</div>}
        {data && !userLoc && !q && !stateF && !typeF && !mapView && <p class="muted small lead">{t.setLocHint}</p>}
        <div class="cgrid">{results.slice(0, shown).map(card)}</div>
        {results.length > shown && <button class="btn more" type="button" onClick={() => setShown(shown + PAGE * 3)}>{t.showMore(results.length - shown)}</button>}
        {data && <p class="muted small">{t.updated(fmtDate(data.generated, lang))}</p>}
      </main>}

      {route.tab === "events" && <EventsView t={t} lang={lang} places={placesById} services={data?.services ?? []} events={data?.events ?? []}
        saved={saved} toggleSave={toggleSave} filters={evFilters} setFilters={setEvFilters} distanceOf={fmtMi} onOpen={openPlace} q={evQ} setQ={setEvQ} />}

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

      {selected && <PlaceSheet place={selected} services={servicesBy.get(selected.id) ?? []} events={eventsBy.get(selected.id) ?? []} details={detailsBy.get(selected.id) ?? null} clergy={clergyBy.get(selected.id) ?? []} links={linksBy.get(selected.id) ?? []} saved={saved} toggleSave={toggleSave} t={t} lang={lang} distance={fmtMi(selected)} onClose={closePlace}
        onSeeEvents={() => { setEvFilters({ ...NO_FILTERS, churches: [selected.id] }); go("#/events"); }} />}
    </div>
  );
}
