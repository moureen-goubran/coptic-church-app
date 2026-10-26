# Build Plan: Version 1 (US)

Last updated: October 26, 2026. Status: **approved by M on October 26, 2026** (real database now, ready-made map, website and app from one build). Building.

## Goal

A free, installable web app at `church.datumarc.com` that lets anyone find a Coptic Orthodox church, monastery or convent in the US, in English or Arabic, on their phone. It should look like the demo (https://claude.ai/artifact/DYTGWfBtSLJ3pdcihCmfKc).

## In version 1

1. **Map and list** of all places in `data/places.csv`, with search and filters (state, type).
2. **Near me:** sorts by distance. Location is used on the phone only and never sent anywhere.
3. **Church page:** address, directions (opens the phone's maps app), phone, website, diocese, service times where known, and the "last verified" date.
4. **English and Arabic**, with right-to-left layout.
5. **Installable and works offline** (add to home screen; the list is saved on the phone).
6. **About and privacy pages** that say what `safety-and-accounts.md` promises.
7. **Corrections box:** no name, email or phone; Turnstile bot check; blocks contact info and links; goes to a private admin inbox only.

## Not in version 1 (later)

- Clergy logins and editing (version 2).
- Events, classes and announcements beyond the 4 demo churches.
- Newcomer help (immigration, language, jobs), Church Supplies, other countries' screens.

## Stack (updated after M's feedback: real database now)

| Part | Choice | Why |
|---|---|---|
| App | Installable web app (PWA): Vite, TypeScript, Preact | Fast on cheap phones, one codebase for iPhone and Android. |
| Database | **Supabase (Postgres) from day one** | M wants it done properly once. Tables for places, service times, clergy, edit history and corrections are designed now so clergy logins slot in later with no rework. `places.csv` is imported into it; new countries import the same way. |
| Map | Ready-made street map like Google's (OpenStreetMap data via MapLibre), not drawn by hand | Looks like Google Maps and is consistent everywhere. Free, and unlike Google Maps it doesn't track users or need a credit card. "Directions" opens Google or Apple Maps on the phone. |
| Hosting | Cloudflare Pages (free), auto-deploys from GitHub `main` | Already decided. |
| Corrections box | Saved to a private database table, with a Turnstile bot check | Only admins can read it. |
| Offline | The app keeps a copy of the list on the phone | Works with weak signal. |

Strict security headers (no outside scripts), HTTPS, no cookies, no analytics beyond Cloudflare's cookie-free visitor count. The public can only read; only admins (later clergy) can write.

## Steps

1. Design the database and import `places.csv`. Scaffold the app in this repo (`app/`), with tests.
2. Map, list, search, near me, church page, matching the demo's look.
3. Arabic and right-to-left, offline, install.
4. Preview link on Cloudflare (`*.pages.dev`) for M to try on a phone.
5. Corrections box.
6. With M's OK: connect `church.datumarc.com` (click-by-click GoDaddy steps; nothing changes without M).

## What M will need to do

- Create free Supabase and Cloudflare accounts (click-by-click steps given when needed; about 10 minutes).
- Later, approve the DNS change.
