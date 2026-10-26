# Data Dictionary: `data/places.csv`

One row per place. Blank means "not added yet". Never guess a value.

| Column | Meaning | Example |
|---|---|---|
| `id` | Permanent unique key: state, city and short name. Never reuse or change it, because links and schedules will point to it. | `nj-bayonne-virgin-mary-st-john` |
| `name` | Official name as the source writes it. | Virgin Mary & St. John Coptic Orthodox Church |
| `type` | `church`, `mission`, `community` (meets without its own building or priest), `monastery`, `convent`, `retreat_center`, `diocese_office`, `seminary` or `school` | `church` |
| `street` | Street address | 4405 West Edinger Avenue |
| `city`, `state`, `zip`, `country` | Location. `state` is the state or province code (NJ, ON). `country` should be the 2-letter ISO code (US, CA, MX); full names like "Canada" are converted by the app build. | Bayonne, NJ, 07002, US |
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

## `data/events.csv`: special dates and "also offered"

Everything that isn't a weekly time. With a `date` (YYYY-MM-DD) it's a one-off event; `end_date` is for events over several days, and `start`/`end` are optional (blank = all day). With no `date` it shows under "Also Offered (Day and Time Not Published)". `kind` is a weekly kind or `retreat`/`social`. Titles and rooms only, no links or descriptions. The public stops seeing an event the day after it ends.

## `data/translations.csv`: Arabic names

`place_id`, `name_ar`, `city_ar`. Blank Arabic falls back to English.

## Map pins

Places without `lat`/`lng` get their city's center from `data/sources/city-coords-approx.csv` and are marked approximate in the app ("the pin shows the city"). Directions still use the full address. Filling exact `lat`/`lng` removes the note.

## `data/place_details.csv`: extra church info

`place_id`, `email` (church office only), `parking_en`/`parking_ar`, `clergy_note_en`/`clergy_note_ar` (how to reach the priests, for example through the office), `logo` (a file we host, `/logos/<place_id>.webp` in `app/public/logos/`), `logo_dark` (`yes` if the logo needs its own dark background), `source_checked`.

## `data/clergy.csv`: priests

`place_id`, `sort` (order shown), `name_en`, `name_ar`, `phone`, `email`, `source_checked`. Leave `phone` and `email` blank: priests' personal contacts appear only if the priest asks in writing (safety-and-accounts.md). Church office contacts go in `places.csv`/`place_details.csv`.

## `data/links.csv`: live stream, social media, giving and other outside links

`place_id`, `kind`, `url`, `label_en`, `label_ar`, `source_checked`. `kind` is one of `live`, `facebook`, `instagram`, `youtube`, `x`, `tiktok`, `donate`, `calendar` (an `https://` calendar feed; the app offers Google and Apple subscribe buttons), `form`, `clergy_page`, `group` (a WhatsApp or GroupMe group), `app` (the church's app on the App Store or Google Play), `tour` (a church tour video), `other`. Links must be `https://` and go to the church's own website or a platform on the safe list (`SAFE_HOSTS` in `app/scripts/load-data.mjs`). Group chats (WhatsApp, GroupMe) must use kind `group` and are not allowed without a priest's written OK. Only official church groups, never a chat run by one person.

Links in this file count as admin-approved. Links clergy add in the app later stay hidden until an admin approves them.

## `data/resources.csv`: Coptic Welcome (help for newcomers)

`id` (unique, lowercase and dashes), `kind` (`link` or `video`), `region` (a state or province code like `NJ`, `US` for the whole country, or `ALL` for anywhere), `title_en`, `title_ar`, `body_en`, `body_ar`, `url`, `source_checked`. Rows show in file order. A `link` needs an `https://` url on the approved list (`RESOURCE_HOSTS` in `app/scripts/load-data.mjs`); adding a site there is the admin's approval. A `video` with no url shows "Coming soon". Only admins can change these in the database; an edit made in the app is kept when the CSV is imported again.
