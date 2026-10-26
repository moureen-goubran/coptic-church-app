# Data Plan

Last updated: October 26, 2026

## Order of work (set by M)

1. **New Jersey**: North, then Central, then South Jersey. ✅ First pass done (30 places).
2. **Neighboring states**: New York, Pennsylvania, Delaware, Connecticut. ✅ First pass done (51 places).
3. Review progress together, then decide the rest of the US, then Canada and beyond.

## Status

| Area | Places | How solid |
|---|---|---|
| New Jersey | 30 (27 churches, plus the archdiocese office, the seminary and a school) | Street address, phone and website for every church. 21 cross-checked in two directories, 2 confirmed on the church's own site, 4 known locally (demo churches). |
| California and Hawaii (Los Angeles diocese) | 54 | Official diocese directory, with addresses. |
| Everything else | 221 | Unverified: Wikipedia, city level only. |

## Sources, best first

| Source | Use it for | Notes |
|---|---|---|
| The church's own website | Final word on address, phone and times | Wins every conflict. |
| Diocese directories (e.g. directory.lacopts.org) | Whole-diocese lists | Only Los Angeles has a usable public one so far. |
| Coptic Society (copticsociety.org/church-locations) | New Jersey addresses, phones, websites | Some addresses are old (e.g. Resurrection still shows Basking Ridge). |
| Nihov Directory (directory.nihov.org) | Every state, with addresses and clergy | Built by "Shenouda Coders". Broad coverage. **Next source for neighboring states.** |
| copticorthodox.church | Diocese and bishop names, and monasteries abroad | Run by the Church. Has no church-level directory, but gave us the Dawsonville, GA convent. |
| CopticFind (app) | Your manual spot-checks | There's no export, so use it to confirm a church exists. Don't copy its data wholesale. |
| PA diocese (copticpa.org/our-churches) | Official list for PA, DE, MD, WV and DC | Found Pottstown, Scranton, Carlisle and the Elysburg monastery, which Nihov is missing. |
| HisVine | A few churches | Lists only churches that use its app. |
| Wikipedia | Starting point only | Stale. At least 7 of its 25 NJ entries had an outdated town, and one name was wrong. |

## What New Jersey taught us

Many churches have moved or renamed their town since the older lists were made (Elizabeth → Linden, Morris Plains → Whippany, Summit → Watchung, Princeton → Monroe, and others). Expect the same in every state, so **never trust a single list**.

Open NJ conflicts (also in `notes`):
- David the Prophet & St. Karas: the church site says 6 Franklin Avenue, Oakland, but Coptic Society says 1 Church Lane, Oakland.
- Virgin Mary & St. John (Bayonne): address and phone conflict, carried over from the demo.
- St. Mark (Jersey City): clergy phone conflict, carried over from the demo.
- CopticFind shows Resurrection at its old Basking Ridge spot. Our list uses the church's own site (Springfield).
- **Come back to:** CopticFind shows an unidentified pin just north of Township of Washington, near the NY line. It's probably St. Mina & Pope Kyrillos VI Cathedral in Suffern, NY, now on the list. Confirm when convenient.
- Phones missing: David the Prophet. Websites missing: St. Mary & St. Stephen, The Virgin St. Shenouda & St. Thomas, Barnegat, Egg Harbor.

## How it stays current

- Each church card shows its **last verified** date. Anything older than 6 months is flagged for re-checking.
- Once clergy logins exist, each church keeps its own row. You cover the churches without an active login.
- A weekly automatic check flags dead websites or changed pages for a person to review. It never edits data on its own.
- Corrections from the public go to the moderated suggestion inbox, never straight into the data.

## Tools

For now: saved copies of each source in `data/sources/`, and a script (`build_places.py`) that builds `places.csv` from them, so every row can be traced and rebuilt. **Don't hand-edit `places.csv`.** Put corrections in a source file. When the app goes live, this moves to a hosted database (Supabase, free at this size) with an admin screen for clergy, so the move happens once and nothing gets redone.
