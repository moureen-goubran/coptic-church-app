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

If a suggestion or report suggests a child may be at risk, the admin **does not investigate or reply**. In New Jersey, **every adult is legally required to report** suspected child abuse: call DCP&P at **1-877-NJ-ABUSE (1-877-652-2873)**, or **911** in an emergency. Then tell the priest, following the diocese's child-protection policy. This page will link the policy once the priests share it.

## Legal notes (plain words)

- **COPPA** (US children's privacy law) mainly applies when an app collects personal info from kids under 13. With no accounts and no data collected from the public, we stay clear of it. Keep it that way.
- A **privacy policy** page is required for app stores and is good practice anyway. It should say exactly what's above.
- Ask the priests whether the diocese has a child-protection policy the app should follow.

## About ads

Your earlier notes asked about one closable ad. My advice: **no ads**. Ad networks track users, and on an app that children use, that creates COPPA risk and app store trouble. It also looks wrong for a church app. If you need to cover costs, use a single "Support this app" link aimed at adults on the About page. Hosting at this size should cost $0 to $25 a month.
