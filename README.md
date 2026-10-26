# My Coptic Church (كنيستي القبطية)

A free, bilingual (English and Arabic) app that puts every Coptic Orthodox church, monastery and convent on one map, with service times, contacts and help for newcomers.

Last updated: October 26, 2026

## What's in this folder

| Path | What it is |
|---|---|
| `README.md` | This page. Start here. |
| `data/places.csv` | **The master list** of churches, monasteries, convents, retreat centers and communities (US). One row per place. |
| `data/sources/` | Raw copies of each public source, plus the script that builds `places.csv` from them. Don't edit `places.csv` by hand until we move to a real database (see the data plan). |
| `app/` | **The real app** (website and installable phone app). See "The app" below. |
| `supabase/` | The database: tables and safety rules (`migrations/`), the church list as SQL (`seed.sql`, generated, not committed), and the corrections box (`functions/`). |
| `data/services.csv`, `data/translations.csv` | Weekly service times and Arabic names, linked to `places.csv` by `id`. |
| `docs/build-plan.md` | What version 1 includes and the tools it uses. |
| `docs/setup-guide.md` | One-time account setup (Supabase, GitHub, Cloudflare). |
| `tools/` | Builds the progress map. `map.html` is the page, and the live copy is at https://claude.ai/artifact/Qds66q6xhp3f19D9bhXVr4 |
| `docs/data-dictionary.md` | What every column in `places.csv` means. |
| `docs/data-plan.md` | Where the data comes from, how it stays current, and what's still missing. |
| `docs/safety-and-accounts.md` | Child safety rules and who can log in. |
| `docs/decisions-and-open-questions.md` | Decisions made so far and questions waiting on you or the priests. |
| `Chat 1/` | Early demo draft, logos, and Bayonne class times (`bayonne-classes.csv`). Reference. |
| `Chat 3 - Building App/` | Latest demo pack (zip) and the handoff notes from your other Claude account. Reference. |
| `Archive/` | Old, including the duplicate Chat 2 pack. Ignored. |

## Where things stand

- **Demo:** version 22 at https://claude.ai/artifact/DYTGWfBtSLJ3pdcihCmfKc. It covers four churches in Bayonne and Jersey City and is the reference design.
- **Dataset:** 323 US places. **Done (first pass): NJ, NY, PA, DE, CT**, with addresses for nearly all of them. Los Angeles has 54 from the official directory. The other 202 are unverified.
- **Progress map:** https://claude.ai/artifact/Qds66q6xhp3f19D9bhXVr4 (updated as each state is finished)
- **Real app:** version 1 built in `app/` (map, search, near me, church pages, English and Arabic, offline, corrections box). Next: accounts setup (`docs/setup-guide.md`), then a preview link, then `church.datumarc.com`.

## Demo page

`tools/build_demo.py` rebuilds the demo (`tools/demo.html`) from `tools/demo_base.html` (the hand-made Jersey City and Bayonne demo) plus `data/places.csv`. The changes it makes are listed in `tools/make_demo_patch.py` and `tools/demo_patch.js`. Rebuild order after a data change: `build_places.py`, then `tools/build_map.py`, then `tools/build_demo.py`. Then republish map.html and demo.html. Demo link: https://claude.ai/artifact/DYTGWfBtSLJ3pdcihCmfKc

## The app

- `app/`: Preact + TypeScript, built with Vite. `npm install`, then `npm run dev` to run it, `npm test` for tests, `npm run build` to build.
- The app ships with a built-in copy of the list (made from `data/*.csv` at build time) and switches to the live Supabase database when it answers. So it works offline and never breaks if the database is down.
- `supabase/seed.sql` is generated from `data/*.csv` automatically (by tests and by the database deploy), so editing the CSVs is enough.
- To restyle: change the color and font variables at the top of `app/src/styles/theme.css`. All wording is in `app/src/i18n.ts`.
