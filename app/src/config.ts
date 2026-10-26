// Public settings. Every visitor's browser gets these, so they are not secrets: the Supabase publishable key
// can only read public data, and the Turnstile site key only works on our own web addresses.
// A build variable (VITE_...) overrides them, e.g. for a test project.
// Accepts the Project URL with or without a trailing "/rest/v1/".
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "") || "https://mzlezpmklamwvtdgcqju.supabase.co";
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "sb_publishable_lBDzeScxPJ6L7SvqhrFRBQ_3MmUsLJi";
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || "0x4AAAAAAFnIW4uqgnGA3eEU";
// Free, keyless map tiles built from OpenStreetMap. No account, no cookies, no tracking.
export const MAP_STYLE = (import.meta.env.VITE_MAP_STYLE as string | undefined) || "https://tiles.openfreemap.org/styles/positron";

// Request headers for Supabase. Legacy anon keys are JWTs and also go in Authorization;
// newer "publishable" keys (sb_publishable_...) must only go in apikey.
export const supabaseHeaders = (): Record<string, string> =>
  SUPABASE_ANON_KEY.startsWith("eyJ") ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : { apikey: SUPABASE_ANON_KEY };
