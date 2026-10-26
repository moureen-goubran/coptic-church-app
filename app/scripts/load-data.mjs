// Reads the master CSVs in ../data and returns validated, app-ready records.
import { readFileSync } from "node:fs";
import { parseCsv } from "./csv.mjs";

const DATA = new URL("../../data/", import.meta.url);
const read = name => parseCsv(readFileSync(new URL(name, DATA), "utf8"));

export const TYPES = ["church", "mission", "community", "monastery", "convent", "retreat_center", "diocese_office", "seminary", "school"];
export const KINDS = ["liturgy", "praise", "bible", "youth", "meeting", "classes", "servants"];
// Country is stored as a 2-letter ISO code (US, CA, MX). Full names are accepted and converted.
const COUNTRY = { "": "US", US: "US", USA: "US", "United States": "US", CA: "CA", Canada: "CA", MX: "MX", Mexico: "MX" };
const num = v => (v === "" ? null : Number(v));
const opt = v => (v === "" ? null : v);

export function loadData() {
  const errors = [];
  const ar = new Map(read("translations.csv").map(r => [r.place_id, r]));
  // Places without an exact pin yet get their city's center, marked approximate.
  const cityPin = new Map(read("sources/city-coords-approx.csv").map(r => [`${r.state}|${r.city}`, [Number(r.lat), Number(r.lng)]]));
  const places = read("places.csv").map(r => {
    const country = COUNTRY[r.country];
    if (!country) errors.push(`${r.id}: unknown country "${r.country}" (add it to COUNTRY in app/scripts/load-data.mjs)`);
    if (!TYPES.includes(r.type)) errors.push(`${r.id}: unknown type "${r.type}"`);
    let lat = num(r.lat), lng = num(r.lng), approx = false;
    if (lat === null) { const c = cityPin.get(`${r.state}|${r.city}`); if (c) { [lat, lng] = c; approx = true; } }
    if (lat !== null && (lat < -90 || lat > 90 || lng < -180 || lng > 180)) errors.push(`${r.id}: bad coordinates`);
    if (r.website && !/^https?:\/\//.test(r.website)) errors.push(`${r.id}: website must start with http(s)://`);
    const t = ar.get(r.id);
    return {
      id: r.id, name: r.name, name_ar: opt(t?.name_ar ?? ""), type: r.type,
      street: opt(r.street), city: r.city, city_ar: opt(t?.city_ar ?? ""), state: r.state, zip: opt(r.zip),
      country: country ?? r.country, diocese: opt(r.diocese), website: opt(r.website), phone: opt(r.phone),
      lat, lng, location_approx: approx, verification: r.verification, last_verified: opt(r.source_checked),
    };
  });
  const ids = new Set();
  for (const p of places) { if (ids.has(p.id)) errors.push(`duplicate id ${p.id}`); ids.add(p.id); }
  const services = read("services.csv").map((r, i) => {
    if (!ids.has(r.place_id)) errors.push(`services row ${i + 2}: unknown place ${r.place_id}`);
    if (!KINDS.includes(r.kind)) errors.push(`services row ${i + 2}: unknown kind ${r.kind}`);
    if (!/^\d{2}:\d{2}$/.test(r.start)) errors.push(`services row ${i + 2}: bad start time`);
    return {
      place_id: r.place_id, day: Number(r.day), start: r.start, end: opt(r.end), kind: r.kind,
      title_en: r.title_en, title_ar: opt(r.title_ar), room_en: opt(r.room_en), room_ar: opt(r.room_ar),
      last_verified: opt(r.source_checked),
    };
  });
  return { places, services, errors };
}
