import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseHeaders } from "../config";
import type { Dataset, Place, Service } from "./types";

// The app always starts from the built-in copy (instant, works offline, survives a paused
// database), then swaps in the live database when it answers.
export async function loadBuiltIn(): Promise<Dataset> {
  const r = await fetch("/data/places.json");
  const d = await r.json();
  return { ...d, source: "built-in" };
}

export async function loadLive(): Promise<Dataset | null> {
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
    const [places, rows] = await Promise.all([
      get<Place>("public_places?select=*&order=state,city,name&limit=10000"),
      get<any>("services?select=place_id,day,start_time,end_time,kind,title_en,title_ar,room_en,room_ar,last_verified&order=place_id,day,start_time&limit=20000"),
    ]);
    const services: Service[] = rows.map(r => ({ ...r, start: r.start_time.slice(0, 5), end: r.end_time?.slice(0, 5) ?? null }));
    if (!places.length) return null;
    return { generated: new Date().toISOString().slice(0, 10), places, services, source: "live" };
  } catch {
    return null;
  }
}
