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
- One PayPal link in the demo uses `http://`. Switch it to `https://`.

## Renewals

- **Supabase access token "github"** (Edge Functions + Edge Function Secrets, project my-coptic-church) expires **October 25, 2027**. Renew it before then: make a new token the same way (docs/setup-guide.md step 1.7), then replace the `SUPABASE_ACCESS_TOKEN` secret in GitHub.
