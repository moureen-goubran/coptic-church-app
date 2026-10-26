# Setup Guide (one time, about 20 minutes)

Last updated: October 26, 2026

Everything here is on free plans. You never paste a password or key into a chat. Keys go only into the websites named below.

Open your password manager (for example Apple Passwords or 1Password). Wherever a step says **save**, copy that value into a new entry there. There is no Save button on the websites; just copy, paste into the entry, and close the window. Don't keep these in plain notes or email: once everything is set up, the GitHub and Cloudflare copies are all you need.

## 1. Supabase (the database)

1. Go to **supabase.com** and click **Start your project**. Sign in with **GitHub**.
2. Click **New project**.
   - Name: `my-coptic-church`
   - Database password: click **Generate a password**, then **save** it.
   - Region: **East US (North Virginia)**
   - Plan: **Free**
   - Security: keep **Enable Data API** checked, **uncheck** "Automatically expose new tables", and **check** "Enable automatic RLS".
3. Click **Create new project** and wait about 2 minutes.
4. Click **Connect** at the top of the page. Copy the top line under **Shared pooler** (starts with `postgresql://`); ignore the connection parameters below it. Paste it into your password manager and replace `[YOUR-PASSWORD]` (brackets too) with your database password from step 2. Only the password is private. If you reset the password, use letters and numbers only, and copy the new one before closing the window. GitHub calls this finished line `SUPABASE_DB_URL`.
5. Open **Project Settings → Data API** and copy the **Project URL**. Then open **API Keys → Legacy API keys** and copy the **anon public** key. Both are public and safe in the app.
6. The **project ref** is the part of the Project URL before `.supabase.co` (for example `abcdxyz`). **Save** it.
7. Click your account picture (top right) → **Account preferences → Access Tokens → Generate new token**. Name it `github`. This token only lets GitHub publish the corrections box (it can't read church data or messages). Optional: skip it and the corrections box shows "opens soon" until you add it. If it asks for details: project = only `my-coptic-church`; permissions = read and write for **Edge Functions** and **Secrets**, everything else off; expiry = 1 year (not "never": a key that never expires stays dangerous if it leaks). **Save** the token (it's shown only once). Note the expiry date in docs/decisions-and-open-questions.md so it gets renewed in time.

## 2. GitHub (so changes go live by themselves)

Open https://github.com/moureen-goubran/coptic-church-app → **Settings → Secrets and variables → Actions**.

On the **Secrets** tab, click **New repository secret** for each:

| Name | Value |
|---|---|
| `SUPABASE_DB_URL` | connection string from step 1.4 |
| `SUPABASE_ACCESS_TOKEN` | token from step 1.7 |
| `SUPABASE_PROJECT_REF` | project ref from step 1.6 |
| `TURNSTILE_SECRET` | secret key from step 3.3 (add after step 3) |

On the **Variables** tab, click **New repository variable** for each:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL from step 1.5 |
| `SUPABASE_ANON_KEY` | anon key from step 1.5 |

## 3. Cloudflare (hosting and the bot check)

1. Go to **dash.cloudflare.com** and sign up (free).
2. Open **Workers & Pages → Create → Import a repository** and pick **coptic-church-app**.
   - Project name: `coptic-church-app`
   - Build command: `npm ci && npm run build`
   - Deploy command: `npx wrangler@4.152.0 deploy`
   - Under **Advanced settings**, set **Path** (root directory) to `app`
   - Under **Build variables**, add `NODE_VERSION` = `22`, `VITE_SUPABASE_URL` = Project URL, `VITE_SUPABASE_ANON_KEY` = anon key
   - Click **Deploy**. You get a free link ending in `.workers.dev`. Tell Claude when it's done.
3. Open **Turnstile → Add widget**. Name: `report box`. Hostnames: `coptic.myorthodoxchurch.com` and `coptic-church-app.moureenjgoubran.workers.dev`. Mode: **Managed**. **Save** the **Site key** and the **Secret key**.
   - Put the Secret key in GitHub (table above, `TURNSTILE_SECRET`).
   - In your Cloudflare project → **Settings → Build → Variables**, add `VITE_TURNSTILE_SITE_KEY` = Site key, then redeploy (**Deployments → ⋯ → Retry build**).

## 4. Your own website address (later, only with your OK)

Claude sends separate GoDaddy steps for `church.datumarc.com` when the app is ready. Nothing changes on GoDaddy until you say so.

## 5. Malware check for links (free, 5 minutes, optional but recommended)

The weekly link check already catches spam and expired church sites. This adds Google's malware and phishing list.

1. Go to console.cloud.google.com and sign in with your Google account. No card is needed.
2. Top bar: **Select a project → New project**. Name it `my-coptic-church` and click **Create**.
3. Menu (☰) → **APIs & Services → Library**. Search **Safe Browsing API**, open it, and click **Enable**.
4. Menu (☰) → **APIs & Services → Credentials → + Create credentials → API key**. Copy the key.
5. On the same page, click the key's name. Under **API restrictions**, pick **Restrict key**, tick **Safe Browsing API**, and click **Save**.
6. On GitHub, open the repo, then **Settings → Secrets and variables → Actions → New repository secret**. Name: `SAFE_BROWSING_KEY`. Secret: paste the key. Click **Add secret**.

## 6. Emails for reports and suggestions (free)

Every report and suggestion is emailed to you. Safety concerns arrive as **URGENT: MY-COPTIC-CHURCH CONCERN**, suggestions as **SUGGESTION: MY-COPTIC-CHURCH**, and other reports as **REPORT: MY-COPTIC-CHURCH**.

1. Go to resend.com and sign up **with the Gmail you want the emails in**. Free plan, no card.
2. Left menu: **API Keys → Create API key**. Name `report box`, permission **Sending access**. Copy the key.
3. On GitHub (**Settings → Secrets and variables → Actions → New repository secret**), add two secrets:
   - `RESEND_API_KEY` = the key
   - `NOTIFY_EMAIL` = your Gmail address
4. Tell Claude. Claude runs **Actions → Deploy database** so the new settings take effect.

## What runs by itself after this

- Every change to the church list or database on `main` is loaded into Supabase (GitHub **Actions → Deploy database**).
- Every change to the app is published by Cloudflare.
- Twice a week, GitHub reads one row so the free database never pauses.
- Corrections are deleted after 90 days.
- Every Monday, GitHub opens every outside link and emails you if one turns into spam or malware (**Actions → Link safety check**).
