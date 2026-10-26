// Public settings, filled in at build time (Cloudflare Pages environment variables).
// None of these are secrets: the Supabase anon key can only read public data.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") || "";
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || "";
// Free, keyless map tiles built from OpenStreetMap. No account, no cookies, no tracking.
export const MAP_STYLE = (import.meta.env.VITE_MAP_STYLE as string | undefined) || "https://tiles.openfreemap.org/styles/positron";
