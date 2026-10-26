# My Coptic Church (كنيستي القبطية)

A free, bilingual (English and Arabic) app that puts every Coptic Orthodox church, monastery and convent on one map, with service times, contacts and help for newcomers.

Last updated: October 26, 2026

## What's in this folder

| Path | What it is |
|---|---|
| `README.md` | This page. Start here. |
| `data/places.csv` | **The master list** of churches, monasteries, convents, retreat centers and communities (US). One row per place. |
| `data/sources/` | Raw copies of each public source, plus the script that builds `places.csv` from them. Don't edit `places.csv` by hand until we move to a real database (see the data plan). |
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
- **Real app:** not started. The plan is an installable web app (PWA) at a subdomain of datumarc.com, with code in the `coptic-church-app` GitHub repo.

## Demo page

`tools/build_demo.py` rebuilds the demo (`tools/demo.html`) from `tools/demo_base.html` (the hand-made Jersey City and Bayonne demo) plus `data/places.csv`. The changes it makes are listed in `tools/make_demo_patch.py` and `tools/demo_patch.js`. Rebuild order after a data change: `build_places.py`, then `tools/build_map.py`, then `tools/build_demo.py`. Then republish map.html and demo.html. Demo link: https://claude.ai/artifact/DYTGWfBtSLJ3pdcihCmfKc
