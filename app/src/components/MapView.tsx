import { useEffect, useRef, useState } from "preact/hooks";
import type { Map as MLMap, GeoJSONSource, StyleSpecification } from "maplibre-gl";
import { MAP_STYLE } from "../config";
import type { Place } from "../lib/types";
import type { Strings } from "../i18n";

interface Props {
  places: Place[];
  selectedId: string | null;
  userLoc: [number, number] | null;
  onSelect: (id: string) => void;
  onView: (b: [[number, number], [number, number]] | null) => void; // what the person moved the map to (null = everything)
  picking: boolean; onPick: (loc: [number, number]) => void; onPickCancel: () => void;
  t: Strings;
  theme: string;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// First view: the US, Canada and Mexico places.
const START_BOUNDS: [[number, number], [number, number]] = [[-125, 18], [-55, 54]];

// Recolor the free OpenStreetMap style to the app's palette, so the map matches the theme.
function paintToTheme(map: MLMap) {
  const land = css("--land"), water = css("--water"), park = css("--park"), road = css("--road"), major = css("--road-major"), label = css("--label");
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    try {
      if (layer.type === "background") map.setPaintProperty(id, "background-color", land);
      else if (layer.type === "fill" && /water/.test(id)) map.setPaintProperty(id, "fill-color", water);
      else if (layer.type === "fill" && /park|wood|grass|landcover|landuse/.test(id)) map.setPaintProperty(id, "fill-color", park);
      else if (layer.type === "line" && /water|river/.test(id)) map.setPaintProperty(id, "line-color", water);
      else if (layer.type === "line" && /motorway|trunk|primary/.test(id) && !/casing/.test(id)) map.setPaintProperty(id, "line-color", major);
      else if (layer.type === "line" && /road|street|highway|minor|secondary|tertiary|path/.test(id) && !/casing/.test(id)) map.setPaintProperty(id, "line-color", road);
      else if (layer.type === "symbol") map.setPaintProperty(id, "text-color", label);
    } catch { /* layer without that property */ }
  }
}

// Colors for our own layers (pins and clusters), re-applied when the theme changes.
function paintPins(map: MLMap) {
  if (!map.getLayer("pins")) return;
  map.setPaintProperty("clusters", "circle-color", css("--lapis"));
  map.setPaintProperty("cluster-count", "text-color", css("--surface"));
  map.setPaintProperty("pins", "circle-color", ["match", ["get", "kind"], "church", css("--lapis"), "monastery", css("--gold"), css("--muted")]);
  map.setPaintProperty("pin-labels", "text-color", css("--fg"));
  map.setPaintProperty("pin-labels", "text-halo-color", css("--surface"));
}

function toGeoJSON(places: Place[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.filter(p => p.lat !== null && p.lng !== null).map(p => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng!, p.lat!] },
      properties: { id: p.id, name: p.name.replace(/ Coptic Orthodox (Church|Monastery|Convent)/, ""), kind: p.type === "monastery" || p.type === "convent" ? "monastery" : p.type === "church" ? "church" : "other" },
    })),
  };
}

// Fit the map to every place shown (works for any country, not just the US).
function fitAll(map: MLMap | null, places: Place[]) {
  const pts = places.filter(p => p.lat !== null && p.lng !== null && p.lng! > -170);
  if (!map || !pts.length) return;
  const lngs = pts.map(p => p.lng!), lats = pts.map(p => p.lat!);
  map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 30, maxZoom: 12, duration: 600 });
}

export function MapView({ places, selectedId, userLoc, onSelect, onView, picking, onPick, onPickCancel, t, theme }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const cb = useRef({ onView, onPick, picking });
  cb.current = { onView, onPick, picking };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ml, worker] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        ml.setWorkerUrl(worker.default); // served from our own site, so the security rules allow it
        if (cancelled || !box.current) return;
        const map = new ml.Map({
          container: box.current, style: MAP_STYLE as string | StyleSpecification, bounds: START_BOUNDS,
          attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, cooperativeGestures: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        map.on("error", e => { if (!map.isStyleLoaded() && /style|fetch/i.test(String(e.error?.message))) setFailed(true); });
        map.on("load", () => {
          paintToTheme(map);
          map.addSource("places", { type: "geojson", data: toGeoJSON([]), cluster: true, clusterRadius: 38, clusterMaxZoom: 9 });
          map.addLayer({ id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"],
            paint: { "circle-color": css("--lapis"), "circle-opacity": 0.9, "circle-stroke-color": "#fff", "circle-stroke-width": 2,
              "circle-radius": ["step", ["get", "point_count"], 13, 10, 17, 40, 22] } });
          map.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"],
            layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Bold"] },
            paint: { "text-color": css("--surface") } });
          map.addLayer({ id: "pins", type: "circle", source: "places", filter: ["!", ["has", "point_count"]],
            paint: { "circle-radius": ["case", ["==", ["get", "id"], ""], 10, 7],
              "circle-color": ["match", ["get", "kind"], "church", css("--lapis"), "monastery", css("--gold"), css("--muted")],
              "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
          map.addLayer({ id: "pin-labels", type: "symbol", source: "places", filter: ["!", ["has", "point_count"]], minzoom: 11,
            layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.2], "text-anchor": "top", "text-font": ["Noto Sans Regular"], "text-max-width": 10 },
            paint: { "text-color": css("--fg"), "text-halo-color": css("--surface"), "text-halo-width": 1.5 } });
          map.on("click", "clusters", async e => {
            const f = e.features?.[0]; if (!f) return;
            const src = map.getSource("places") as GeoJSONSource;
            const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id);
            map.easeTo({ center: (f.geometry as any).coordinates, zoom }, { userMove: true });
          });
          // Only moves the person made (drag, zoom, cluster tap) narrow the list, not the app's own fly-tos.
          map.on("moveend", (e: any) => {
            if (!e.originalEvent && !e.userMove) return;
            const b = map.getBounds();
            cb.current.onView([[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]]);
          });
          map.on("click", e => { if (cb.current.picking) cb.current.onPick([e.lngLat.lat, e.lngLat.lng]); });
          map.on("click", "pins", e => { if (cb.current.picking) return; const id = e.features?.[0]?.properties.id; if (id) onSelectRef.current(id); });
          for (const l of ["clusters", "pins"]) {
            map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
          }
          setReady(true);
        });
      } catch { setFailed(true); }
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => { const c = mapRef.current?.getCanvas(); if (c) c.style.cursor = picking ? "crosshair" : ""; }, [ready, picking]);

  useEffect(() => {
    const map = mapRef.current;
    if (ready && map) (map.getSource("places") as GeoJSONSource).setData(toGeoJSON(places));
  }, [ready, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setPaintProperty("pins", "circle-radius", ["case", ["==", ["get", "id"], selectedId ?? ""], 11, 7]);
    const p = places.find(x => x.id === selectedId);
    if (p?.lat != null && p.lng != null) map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 12), duration: 800 });
  }, [ready, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    // Wait a frame so the new theme's colors are in place before reading them.
    const repaint = () => requestAnimationFrame(() => { paintToTheme(map); paintPins(map); });
    repaint();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", repaint);
    return () => mq.removeEventListener("change", repaint);
  }, [ready, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const data = { type: "FeatureCollection" as const, features: userLoc ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [userLoc[1], userLoc[0]] } }] : [] };
    const src = map.getSource("me") as GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      map.addSource("me", { type: "geojson", data });
      map.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 8, "circle-color": "#2a7de1", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
    }
    if (userLoc) map.flyTo({ center: [userLoc[1], userLoc[0]], zoom: 9, duration: 800 });
  }, [ready, userLoc]);

  return (
    <div class="mapbox">
      <div class="map" ref={box} role="region" aria-label={t.tabChurches} />
      {failed && <div class="mapfail">{t.mapFail}</div>}
      {picking && <div class="pickbar" role="status"><span>{t.pickHint}</span><button type="button" onClick={onPickCancel}>{t.cancel}</button></div>}
      <div class="mapbar">
        <span class="mapnote">{t.mapNote}</span>
        <button class="btn small" type="button" onClick={() => { fitAll(mapRef.current, places); onView(null); }}>{t.fullMap}</button>
      </div>
    </div>
  );
}
