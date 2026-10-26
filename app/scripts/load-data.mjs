// Reads the master CSVs in ../data and returns validated, app-ready records.
import { readFileSync } from "node:fs";
import { parseCsv } from "./csv.mjs";

const DATA = new URL("../../data/", import.meta.url);
const read = name => parseCsv(readFileSync(new URL(name, DATA), "utf8"));

export const TYPES = ["church", "mission", "community", "monastery", "convent", "retreat_center", "diocese_office", "seminary", "school"];
export const KINDS = ["liturgy", "praise", "bible", "youth", "meeting", "classes", "servants"];
export const EVENT_KINDS = [...KINDS, "retreat", "social"];
export const LINK_KINDS = ["live", "facebook", "instagram", "youtube", "x", "tiktok", "donate", "calendar", "form", "clergy_page", "other"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Outside links must go to a known platform or the church's own website (safety-and-accounts.md).
// Group chats (WhatsApp, GroupMe, Telegram) are left out on purpose: each needs a priest's written OK.
const SAFE_HOSTS = ["facebook.com", "instagram.com", "youtube.com", "twitter.com", "x.com", "tiktok.com", "pushpay.com", "paypal.com",
  "calendar.google.com", "forms.gle", "docs.google.com", "ccbchurch.com", "givelify.com", "tithe.ly"];
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const under = (h, d) => h === d || h.endsWith("." + d);
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
  // One-off events (with a date) and "also offered" ministries (no date or time published).
  const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^\d{2}:\d{2}$/;
  const events = read("events.csv").map((r, i) => {
    const at = `events row ${i + 2}`;
    if (!ids.has(r.place_id)) errors.push(`${at}: unknown place ${r.place_id}`);
    if (!EVENT_KINDS.includes(r.kind)) errors.push(`${at}: unknown kind ${r.kind}`);
    if (r.date && !DATE.test(r.date)) errors.push(`${at}: date must look like 2026-11-01`);
    if (r.end_date && (!r.date || !DATE.test(r.end_date) || r.end_date < r.date)) errors.push(`${at}: bad end_date`);
    if (!r.date && (r.start || r.end_date)) errors.push(`${at}: a time needs a date`);
    if ((r.start && !TIME.test(r.start)) || (r.end && (!TIME.test(r.end) || !r.start))) errors.push(`${at}: bad time`);
    if (!r.title_en || r.title_en.length > 140) errors.push(`${at}: title_en must be 2 to 140 characters`);
    return {
      place_id: r.place_id, date: opt(r.date), end_date: opt(r.end_date), start: opt(r.start), end: opt(r.end), kind: r.kind,
      title_en: r.title_en, title_ar: opt(r.title_ar), room_en: opt(r.room_en), room_ar: opt(r.room_ar), last_verified: opt(r.source_checked),
    };
  });
  const check = (file, i, r) => { if (!ids.has(r.place_id)) errors.push(`${file} row ${i + 2}: unknown place ${r.place_id}`); if (r.email && !EMAIL.test(r.email)) errors.push(`${file} row ${i + 2}: bad email`); };
  const details = read("place_details.csv").map((r, i) => {
    check("place_details", i, r);
    if (r.logo && !/^\/logos\/[a-z0-9-]+\.(webp|png)$/.test(r.logo)) errors.push(`place_details row ${i + 2}: logo must be /logos/<name>.webp`);
    return {
      place_id: r.place_id, email: opt(r.email), parking_en: opt(r.parking_en), parking_ar: opt(r.parking_ar),
      clergy_note_en: opt(r.clergy_note_en), clergy_note_ar: opt(r.clergy_note_ar), logo: opt(r.logo), logo_dark: r.logo_dark === "yes",
      last_verified: opt(r.source_checked),
    };
  });
  const clergy = read("clergy.csv").map((r, i) => {
    check("clergy", i, r);
    return { place_id: r.place_id, sort: Number(r.sort) || 0, name_en: r.name_en, name_ar: opt(r.name_ar), phone: opt(r.phone), email: opt(r.email), last_verified: opt(r.source_checked) };
  });
  // Links in the CSV are checked by an admin before they're added, so they go in approved.
  const links = read("links.csv").map((r, i) => {
    check("links", i, r);
    if (!LINK_KINDS.includes(r.kind)) errors.push(`links row ${i + 2}: unknown kind ${r.kind}`);
    if (!/^https:\/\/\S+$/.test(r.url)) errors.push(`links row ${i + 2}: url must start with https://`);
    const h = hostOf(r.url), site = hostOf(places.find(p => p.id === r.place_id)?.website ?? "");
    if (!SAFE_HOSTS.some(d => under(h, d)) && !(site && under(h, site))) errors.push(`links row ${i + 2}: ${h} isn't on the safe list (SAFE_HOSTS in app/scripts/load-data.mjs) or the church's own website`);
    return { place_id: r.place_id, kind: r.kind, url: r.url, label_en: opt(r.label_en), label_ar: opt(r.label_ar), last_verified: opt(r.source_checked) };
  });
  return { places, services, events, details, clergy, links, errors };
}
