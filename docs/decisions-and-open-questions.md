# Decisions and Open Questions

Last updated: October 26, 2026

## Decided

- Installable web app (PWA) first. A store version comes later, only if it adds real phone features.
- Bilingual English and Arabic, with right-to-left layout from day one.
- **Safety:** the safest option every time, with heavy moderation. Clergy-only logins and no public accounts (see `safety-and-accounts.md`).
- **Upkeep:** M and the clergy. Clergy edit only their own church, and every church shows a "last verified" date.
- **Data order:** New Jersey (North → Central → South), then neighboring states, then review together.
- **One master dataset**, with the app reading from it. This is built once to last, so nothing gets redone.
- **Hosting:** free (Cloudflare Pages), with the app at a subdomain such as `church.datumarc.com`. The domain is registered at GoDaddy, and nothing is on it now. Claude will send DNS steps when the app is ready, and DNS won't change without M's OK.
- **Church Supplies** (the two files in the top folder) is a future feature: helping churches and people find vendors. Leave those files alone for now.
- Duplicate demo copies moved to `Archive/Chat 2 (duplicate of Chat 3 pack)` on October 26, 2026.

## Waiting on you

1. Connect GitHub and add the coptic-church-app repo to the project (steps are in the thread).
2. Is there a second trusted adult who can be co-admin? Ideally someone a priest names.

## Waiting on the priests

1. Who keeps each church's information updated? (Most important.)
2. Does the church already use an app such as ChMeetings?
3. Where are announcements posted first: website, WhatsApp, bulletin?
4. Permission to show the church's name, logo and photos. Does the diocese need to approve the app's name?
5. Can we link WhatsApp or GroupMe groups, and who approves who joins?
6. Parking notes.
7. Zelle or QR giving links.
8. What translation help is offered today?
9. The diocese's child-protection policy, so the app can link it and follow it.
10. Who would be the second admin?

## Carried over from the demo (unresolved)

- The Arabic hasn't been checked by a native reader.
- Bayonne class times come from a feed last modified September 1, 2025.
- Sources conflict on St. Mark's clergy phone and on Virgin Mary & St. John's address and phone.
- The St. Abanoub & St. Antonious Sunday liturgy time is an assumption.
- Priests' personal phones and emails from the demo were left out (safety rule: only with the priest's written OK). Names are shown.
- Synaxarium links go to st-takla.org (same as the demo). Check that a few days open correctly, especially the Nasie month.

## Events (October 26, 2026)

- Before clergy logins go live: an edit made in the app must mark the church `edited_in_app`, or the next CSV import replaces that church's services and events. Add a database trigger for this in version 2.
- Also Offered items from the demo had links to church pages. They were left out because outside links need admin approval; the church's website is on its page.
- Event colors per church: the 4 demo churches keep the demo colors; others get a fixed color from a palette.

## Renewals

- **Supabase access token "github"** (Edge Functions + Edge Function Secrets, project my-coptic-church) expires **October 25, 2027**. Renew it before then: make a new token the same way (docs/setup-guide.md step 1.7), then replace the `SUPABASE_ACCESS_TOKEN` secret in GitHub.

## Coptic Welcome (October 26, 2026)

- Built like the demo: Helpful Links, Video Walkthroughs, Mental Health Support (coming soon) and the Suggestion Box, with a search box. Items live in `data/resources.csv` and the `resources` table (admins only).
- Most links are New Jersey only, so each shows a "New Jersey" or "United States" tag. Other states need their own 211, ESL and aid links.
- The suggestion box has no name field (the demo had one): children may use the app, so it never asks who you are. It uses the same screening and bot check as corrections.
- "Welcome Home Jersey City" links to a blog article (hobokengirl.com), not the group's own site. Replace it when the official page is found.
- The Coptic Reader link is the iPhone App Store only. Add the Android link.
- Walkthrough videos are not recorded yet. Mental health names need priests' OK first.
- Church map: the map now shows every church. A search or filter zooms to the matches and fades the rest; moving the map lists everything in view, with "Back to my search".
