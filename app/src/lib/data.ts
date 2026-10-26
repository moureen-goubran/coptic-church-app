import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseHeaders } from "../config";
import type { ChurchEvent, Clergy, Dataset, Details, Link, Place, Resource, Service } from "./types";

// The app always starts from the built-in copy (instant, works offline, survives a paused
// database), then swaps in the live database when it answers.
export async function loadBuiltIn(): Promise<Dataset> {
  const r = await fetch("/data/places.json");
  const d = await r.json();
  return { events: [], resources: [], ...d, source: "built-in" };
}

// events and resources are null when they couldn't be read live; the app then keeps the built-in ones.
export async function loadLive(): Promise<(Omit<Dataset, "events" | "resources"> & { events: ChurchEvent[] | null; resources: Resource[] | null }) | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const headers = supabaseHeaders();
  const get = async <T,>(path: string): Promise<T[]> => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, signal: ctl.signal });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } finally { clearTimeout(timer); }
  };
  try {
    const [places, rows, evRows, details, clergy, links, resources] = await Promise.all([
      get<Place>("public_places?select=*&order=state,city,name&limit=10000"),
      get<any>("services?select=place_id,day,start_time,end_time,kind,title_en,title_ar,room_en,room_ar,last_verified&order=place_id,day,start_time&limit=20000"),
      // Kept apart so a missing events table (before the database update runs) doesn't sink the rest.
      get<any>("events?select=place_id,date,end_date,start_time,end_time,kind,title_en,title_ar,room_en,room_ar,last_verified&order=date.nullslast,start_time&limit=20000").catch(() => null),
      get<Details>("place_details?select=place_id,email,parking_en,parking_ar,clergy_note_en,clergy_note_ar,logo,logo_dark,last_verified&limit=10000"),
      get<Clergy>("clergy?select=place_id,sort,name_en,name_ar,phone,email&order=place_id,sort&limit=20000"),
      get<Link>("place_links?select=place_id,kind,url,label_en,label_ar&order=place_id,id&limit=20000"),
      get<Resource>("resources?select=id,sort,kind,region,title_en,title_ar,body_en,body_ar,url,last_verified&order=sort&limit=1000").catch(() => null),
    ]);
    const services: Service[] = rows.map(r => ({ ...r, start: r.start_time.slice(0, 5), end: r.end_time?.slice(0, 5) ?? null }));
    const events: ChurchEvent[] | null = evRows && evRows.map(({ start_time, end_time, ...r }) => ({ ...r, start: start_time?.slice(0, 5) ?? null, end: end_time?.slice(0, 5) ?? null }));
    if (!places.length) return null;
    return { generated: new Date().toISOString().slice(0, 10), places, services, events, details, clergy, links, resources, source: "live" };
  } catch {
    return null;
  }
}
