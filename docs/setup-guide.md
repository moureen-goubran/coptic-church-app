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
4. Click **Connect** at the top of the page. Under **Session pooler**, copy the long line that starts with `postgresql://`. It has a blank in it that says `[YOUR-PASSWORD]`. Delete that blank (brackets too) and type your database password from step 2 in its place. **Save** the finished line. This is the **connection string** (GitHub calls it `SUPABASE_DB_URL`).
5. In the left menu, open **Project Settings → API keys** (or **Data API**). **Save** the **Project URL** and the **anon / public** key. These two are public and safe in the app.
6. The **project ref** is the part of the Project URL before `.supabase.co` (for example `abcdxyz`). **Save** it.
7. Click your account picture (top right) → **Account preferences → Access Tokens → Generate new token**. Name it `github`. **Save** it.

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
2. Open **Workers & Pages → Create → Pages → Connect to Git**. Pick **coptic-church-app**.
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: `npm ci && npm run build`
   - Build output directory: `dist`
   - Root directory: `app`
   - Environment variables: `NODE_VERSION` = `22`, `VITE_SUPABASE_URL` = Project URL, `VITE_SUPABASE_ANON_KEY` = anon key
   - Click **Save and Deploy**. You get a free link ending in `.pages.dev`. Tell Claude when it's done.
3. Open **Turnstile → Add widget**. Name: `corrections box`. Hostnames: `church.datumarc.com` and your `.pages.dev` address. Mode: **Managed**. **Save** the **Site key** and the **Secret key**.
   - Put the Secret key in GitHub (table above, `TURNSTILE_SECRET`).
   - In Cloudflare Pages → your project → **Settings → Variables**, add `VITE_TURNSTILE_SITE_KEY` = Site key, then **Deployments → Retry deployment**.

## 4. Your own website address (later, only with your OK)

Claude sends separate GoDaddy steps for `church.datumarc.com` when the app is ready. Nothing changes on GoDaddy until you say so.

## What runs by itself after this

- Every change to the church list or database on `main` is loaded into Supabase (GitHub **Actions → Deploy database**).
- Every change to the app is published by Cloudflare.
- Twice a week, GitHub reads one row so the free database never pauses.
- Corrections are deleted after 90 days.
