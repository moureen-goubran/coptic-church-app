# Safety and Accounts

Last updated: October 26, 2026. Approved by M: "whatever is safest for the children," with heavy moderation.

Children (some under 13) will use this app, so it's built to be safe by default. The rule behind everything here: **strangers can never reach a child through this app.** No accounts, messages, posts, uploads or comments are open to the public.

## Who can log in

| Who | Account? | What they can do |
|---|---|---|
| Everyone (public, including kids) | **No account** | Browse, search, save events to their own calendar, send a correction. |
| Clergy (and servants a priest names) | Yes | Edit **only their own church's** info and schedule. |
| You (app admin) | Yes | Approve clergy accounts, review reports, edit anything. |

- Clergy accounts are **created by invitation only**. There's no public sign-up page. Each invite is checked with the church (for example by calling the church office number on the diocese's list).
- Logins use a one-time email link or code, so there are no passwords to leak.
- Every edit is logged with who made it and when, and can be undone.

## Rules that protect kids

- **No public accounts and no public posting.** Nothing a visitor types appears in the app.
- **The suggestion box goes to a moderated inbox.** It asks for no name, email or phone. If someone types personal info anyway, it's only visible to the admin.
- **No personal data about children:** no names, no photos of kids, no class rosters. Class listings show grade and time only.
- **No priests' personal phone numbers or emails** unless the priest asks in writing. Church office contacts only.
- **No tracking, no ads aimed at kids, and no third-party analytics that profile users.** Location is used on the device to find nearby churches and is never sent or stored.
- **No direct messaging** between users.
- **External links** (WhatsApp groups, social media) appear only if the church approves them. A link to a group chat lets a stranger join, so each one needs a priest's OK.
- **Church websites are re-checked every week** (`.github/workflows/link-check.yml`). Old church domains expire and get bought by gambling or adult sites, or get hacked. The check opens every link and fails, which makes GitHub email the owner, if a page shows spam or the live site loses a security header. Remove a bad link from `data/places.csv` and add its domain to `BLOCKED_HOSTS` in `app/scripts/load-data.mjs`. The first check, on 2026-10-26, found two hijacked sites and five expired domains, and all seven links were removed.
- **Private data is leak-tested every week** (`app/scripts/check-security.mjs`, same workflow). It acts like a stranger with the app's public key and tries to read report messages, admin notes, the admin and editor lists and the edit history, and to add or change churches, services and links. Every attempt must be refused. It also reports any warning from Supabase's own security advisor and any known high-risk hole in the app's packages. If anything fails, GitHub emails the owner.

## Industry best practice, and where we go further

The standards we follow: COPPA (US law), Apple's Kids Category rules and Google Play's Families policy (the strictest app store rules), the UK Age Appropriate Design Code (the international benchmark for "safe by default"), and the child-protection practice churches already use (screening adults, never one-on-one contact).

| Practice | Industry norm | Our app |
|---|---|---|
| Accounts for kids | Parental consent required | **None at all.** Nothing to consent to. |
| Public posting | Moderated after posting | **Not possible.** The only input is the suggestion box, and it's never shown publicly. |
| Suggestion box | Spam filter | **Pre-moderated:** a person reads everything before acting on it. An automatic filter blocks phone numbers, emails, addresses and links. A privacy-friendly bot check (Cloudflare Turnstile) stops spam without tracking. Submissions are deleted after 90 days. |
| Photo/file uploads | Scanned | **Public can't upload anything.** Only clergy can upload church logos and photos, and photos of children are not allowed. |
| Messaging | Reporting tools | **No messaging features at all.** This follows the church "no one-on-one" rule. |
| Clergy accounts | Email check | **Invitation only, confirmed by phone** through the church office number on the diocese's list. Two-step login required. Access is removed when a priest moves. |
| Clergy edits | Live immediately | Schedule and text edits go live, logged and undoable. **New external links** (WhatsApp, social media, giving pages) **wait for admin approval**, because a link is how a stranger could get a child into a private chat. |
| Admin accounts | One admin | **At least two admins** (you plus one trusted adult named by a priest), so no single person controls everything and there's cover if you're away. Two-step login required. |
| Analytics and ads | "Kid-safe" ad networks | **No ads, no third-party trackers.** At most, a privacy-first visitor count with no cookies (for example Cloudflare Web Analytics). |
| Location | Asked at startup | Used **only when tapped**, only on the device, never stored or sent. |
| Security | Varies | HTTPS everywhere, strict content security rules so no outside scripts can run, and every external link checked against a list of safe domains. |

## If something concerning comes in

If a suggestion or report suggests a child may be at risk, the admin **does not investigate or reply**. Call **911** in an emergency. Otherwise report to the child protection agency of the state or province where the child is (in New Jersey, every adult must report: DCP&P **1-877-652-2873**). If you don't know which agency, call the **Childhelp hotline, 1-800-422-4453**, and they will route it. Then tell the priest, following the diocese's child-protection policy. This page will link the policy once the priests share it.

## Legal notes (plain words)

- **COPPA** (US children's privacy law) mainly applies when an app collects personal info from kids under 13. With no accounts and no data collected from the public, we stay clear of it. Keep it that way.
- A **privacy policy** page is required for app stores and is good practice anyway. It should say exactly what's above.
- Ask the priests whether the diocese has a child-protection policy the app should follow.

## About ads

Your earlier notes asked about one closable ad. My advice: **no ads**. Ad networks track users, and on an app that children use, that creates COPPA risk and app store trouble. It also looks wrong for a church app. If you need to cover costs, use a single "Support this app" link aimed at adults on the About page. Hosting at this size should cost $0 to $25 a month.

## App store and admin readiness (review of October 26, 2026)

**Nobody can promise approval.** Both stores review by hand and reject first submissions often. The plan below removes every known reason for rejection; what's left is the reviewer's judgment.

### Real risks, biggest first

1. **Apple can reject a website in a wrapper** (guideline 4.2, "minimum functionality"). This is the most common rejection for apps like ours. To pass, the iPhone app needs things a website can't do: saved events and feasts as **phone reminders** (local notifications, no accounts), **works fully offline**, native **share** and **add to calendar**, and ideally a **home-screen widget** with today's Coptic date. Plan this as its own build step before submitting to Apple.
2. **Don't list it in Apple's Kids category or Google's "Designed for Families" program.** Both require a parent gate before any link leaves the app, and our app is mostly links (church websites, maps, 988). List it under Reference or Lifestyle. Google still asks for the age groups: choosing ages under 13 means Google's Families rules apply anyway (we meet them: no ads, no tracking, no accounts). Answer honestly that children may use it.
3. **Looking "official".** Both stores reject apps that seem to speak for an organization they don't belong to. The About page now says the app is independent and not run by the Coptic Orthodox Church. Also: **get written OK** (an email is enough) from each church whose **logo** we show, and don't use the Coptic cross in a way that looks like the Church's own seal in the store icon.
4. **Google's new-account rule.** A personal Google Play account must run a closed test with **at least 12 testers for 14 days** before it can publish. An **organization account** (your LLC) skips this but needs a free **D-U-N-S number**, which can take up to 30 days. Apply for the D-U-N-S now. Apple asks for the same number for an organization account.
5. **Clergy login inside the store app.** If clergy can log in inside the app, Apple wants a demo login for the reviewer and both stores want an in-app "delete my account" option. Simplest: keep clergy and admin editing on the **website only**, never in the store app.
6. **Donations.** Apple only lets registered nonprofits ask for donations. An LLC can't add a "Support this app" link in the iPhone app. Church websites that have their own Donate button are fine.

### Checklist

| # | Item | Status | Who |
|---|---|---|---|
| 1 | No public accounts, posting, messaging or uploads | Done | — |
| 2 | Report box: bot check, contact-info filter, 90-day delete, emails you | Done | — |
| 3 | Weekly link safety and leak check | Done (malware part waits on `SAFE_BROWSING_KEY`) | You: add the key |
| 4 | Security headers, strict content rules, HTTPS | Done | — |
| 5 | "Not an official Church app" note on About (English and Arabic) | Done | — |
| 6 | Automatic package security updates (Dependabot) | Done | — |
| 7 | Move to `coptic.myorthodoxchurch.com` | Missing | Claude, with your OK |
| 8 | **Privacy policy** as its own page with a plain web address (stores need a link). Must name what third parties see: Cloudflare (hosting, bot check), Supabase (database), Resend (report emails), OpenFreeMap (map tiles, which reveal roughly what area you're looking at) | Missing (only a short list on About) | Claude |
| 9 | **Terms of use** page: information may be out of date, call before you go, not official | Missing | Claude |
| 10 | Public **support email**, for example `support@myorthodoxchurch.com` (free with Cloudflare Email Routing) instead of your personal Gmail | Missing | You (Claude gives steps) |
| 11 | Written OK from each church whose logo is shown | Missing | You |
| 12 | D-U-N-S number for the LLC | Missing | You |
| 13 | Two-step login (authenticator app, not text messages) on **Gmail, GitHub, Supabase, Cloudflare, Resend, the domain registrar**, and later Google Play and Apple. Save the backup codes offline | Can't check from here | You |
| 14 | A **second admin** (a trusted adult a priest names) | Missing | You |
| 15 | Clergy login and admin screens (invite only, two-step login enforced by the database, edits logged) | Not built yet | Claude, as its own section |
| 16 | **Backups.** Today the database is rebuilt from the files in GitHub, so nothing is lost. Once clergy edit live, add a weekly export of the public tables to GitHub. Report messages are never backed up | Not needed yet | Claude, with clergy login |
| 17 | **Key rotation:** change the Supabase server key, Resend key and Turnstile secret once a year and right away if one may have leaked. The Supabase access token expires **2027-10-25** | Plan only | You (Claude gives steps) |
| 18 | Turn on GitHub **secret scanning and push protection** (Settings → Code security) | Can't check from here | You |
| 19 | **Incident plan** for a hacked account or bad link: 1) take the link or page down, 2) change the affected passwords and keys, 3) check the edit log and undo, 4) if private messages may have leaked, tell the people affected and note what happened here | Written (this list) | — |
| 20 | Store paperwork: Google Data safety form, content rating, Apple privacy labels and age rating | Missing | Claude drafts the answers, you submit |
| 21 | Phone app build: Google first (wrapper around the website), then Apple with the extras in risk 1 | Not started | Claude |

### What to declare on the store forms (draft)

- **Collected:** only what someone types into the report box (Google: "Other user-generated content"; Apple: "Other user content"). Not linked to a person, not used for tracking, not shared or sold, deleted after 90 days, sent over HTTPS.
- **Not collected:** location (used only on the phone), names, emails, phone numbers, contacts, photos, identifiers, analytics.
- The bot check (Cloudflare Turnstile) reads browser signals to stop spam. This counts as "fraud prevention and security", which COPPA and both stores allow. Name it in the privacy policy.
