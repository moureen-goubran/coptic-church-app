# Data Dictionary: `data/places.csv`

One row per place. Blank means "not added yet". Never guess a value.

| Column | Meaning | Example |
|---|---|---|
| `id` | Permanent unique key: state, city and short name. Never reuse or change it, because links and schedules will point to it. | `nj-bayonne-virgin-mary-st-john` |
| `name` | Official name as the source writes it. | Virgin Mary & St. John Coptic Orthodox Church |
| `type` | `church`, `mission`, `community` (meets without its own building or priest), `monastery`, `convent`, `retreat_center`, `diocese_office`, `seminary` or `school` | `church` |
| `street` | Street address | 4405 West Edinger Avenue |
| `city`, `state`, `zip`, `country` | Location. `state` is the two-letter code. | Bayonne, NJ, 07002, US |
| `region` | Area within a state, used to work through the list in order. New Jersey: `North`, `Central`, `South` (by county). | North |
| `diocese` | Diocese and bishop, as the source names them | Archdiocese of North America |
| `website`, `phone` | Official church contact only. Never a priest's personal number. | |
| `lat`, `lng` | Map coordinates. Filled once addresses are confirmed. | |
| `verification` | From strongest to weakest: `church_confirmed` (from the church's own website or office), `known_locally` (you or a servant confirmed it), `official_directory` (the diocese's own list), `cross_checked` (two independent directories agree), `unverified` (one secondary source only). When sources disagree, the church's own site wins, and the conflict goes in `notes`. | `unverified` |
| `source_url` | Where the row came from | |
| `source_checked` | Date the source was last read (YYYY-MM-DD) | 2026-10-26 |
| `notes` | Conflicts or doubts to resolve | |

## `data/services.csv`: weekly service times

One row per weekly service, linked to `places.csv` by `place_id`. `day` is 0 (Sunday) to 6 (Saturday). `start` and `end` are 24-hour `HH:MM`. `kind` is one of `liturgy`, `praise`, `bible`, `youth`, `meeting`, `classes`, `servants`. `title_en`/`title_ar` and `room_en`/`room_ar` are shown in the app. `source_checked` is the date it was read. The first 59 rows are the four Jersey City and Bayonne churches from the demo.

## `data/translations.csv`: Arabic names

`place_id`, `name_ar`, `city_ar`. Blank Arabic falls back to English.

## Map pins

Places without `lat`/`lng` get their city's center from `data/sources/city-coords-approx.csv` and are marked approximate in the app ("the pin shows the city"). Directions still use the full address. Filling exact `lat`/`lng` removes the note.

## Coming later

- `clergy`: names and roles only. No personal contact details unless the priest asks for them.
