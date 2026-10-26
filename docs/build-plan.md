# Build Plan: Version 1 (US)

Last updated: October 26, 2026. Status: **waiting for M's OK.**

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

## Stack (challenge: no database yet)

Version 1 only *shows* data and nobody logs in, so it doesn't need a database. A **static site** built from `places.csv` is free, faster, works offline, and has nothing to hack.

| Part | Choice | Why |
|---|---|---|
| App | Static PWA (Vite, plain TypeScript, small Preact UI) | Fast on cheap phones, no server. |
| Data | Build step turns `places.csv` into `places.json` | Same master list; new countries load with no code change. |
| Map | MapLibre with a map file hosted on our own site (Protomaps) | No outside tile service, so no third party sees who looks where. |
| Hosting | Cloudflare Pages (free), auto-deploys from GitHub `main` | Already decided. |
| Corrections box | One Cloudflare Worker + Turnstile, emails the admin | Free, no tracking. |
| Database | **Supabase, added in version 2** when clergy log in | Only pay the complexity when it's needed. |

Strict security headers (no outside scripts), HTTPS, no cookies, no analytics beyond Cloudflare's cookie-free visitor count.

## Steps

1. Scaffold the app in this repo (`app/`), with the data build step and tests.
2. Map, list, search, near me, church page, matching the demo's look.
3. Arabic and right-to-left, offline, install.
4. Preview link on Cloudflare (`*.pages.dev`) for M to try on a phone.
5. Corrections box.
6. With M's OK: connect `church.datumarc.com` (click-by-click GoDaddy steps; nothing changes without M).

## What M will need to do

- Create a free Cloudflare account and connect it to GitHub (steps will be given when step 4 is ready).
- Later, approve the DNS change.
