# VectorHorizon Launch Guide

Step-by-step from zero to deployed.

---

## Pre-check

- [ ] GitHub repo pushed (required for Vercel + Cloudflare Workers)
- [ ] `frontend/.env.local` created (copy from `frontend/.env.example`)
- [ ] Cloudflare account (free tier, for Workers + R2)
- [ ] Clerk account (free tier)
- [ ] Supabase account (free tier)
- [ ] NVIDIA NIM API access (free developer tier at build.nvidia.com)

---

## Phase 1: Clerk Auth (~5 min)

### 1.1 Create Clerk application

1. Go to [clerk.com](https://clerk.com) → **Create Application**
2. Name: `VectorHorizon`
3. Enable: **Email + Password** and **Google** sign-in
4. Go to **API Keys** → copy both:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
5. Paste into `frontend/.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxx
   CLERK_SECRET_KEY=sk_live_xxxxxxxxx
   ```

### 1.2 Get JWKS URL (for Supabase verification)

> ⚠️ Do **not** create a custom JWT template. Clerk's default JWT already includes `sub = user.id` (a reserved JWT claim that can't be customized). Supabase RLS uses `auth.jwt()->>'sub'` which works with the default Clerk JWT out of the box.

1. Clerk Dashboard → **JWT Templates** (section header, not creating a template)
2. Copy the **JWKS Endpoint** URL at the top of the page — looks like:
   `https://<your-domain>.clerk.accounts.dev/.well-known/jwks.json`
3. Save this as your `CLERK_JWKS_URL` for Supabase + Worker config.

### 1.3 Set redirect URLs

1. Clerk Dashboard → **URLs & Redirects**
2. Set:
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

---

## Phase 2: Supabase Database (~10 min)

### 2.1 Create project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `vectorhorizon`
3. Choose region closest to you
4. Wait ~2min for database to provision

### 2.2 Run schema

1. Supabase Dashboard → **SQL Editor**
2. Open and run `worker/supabase-schema.sql` (the entire file)
3. Verify tables created: `worlds`, `world_transitions`
4. Verify RLS is enabled on both tables

### 2.3 Configure Clerk JWT verification

1. Supabase Dashboard → **Project Settings** → **Authentication**
2. Under **JWT Settings**, enable **Use Auth Hook** — toggle ON
3. Under **Auth Hook URL**, leave blank (we use Clerk JWT directly)
4. Under **JWT Settings** → **JWKS URL**, paste your Clerk JWKS URL from Step 1.2 (Get JWKS URL):
   `https://<your-domain>.clerk.accounts.dev/.well-known/jwks.json`

   > 💡 Supabase will verify Clerk-issued JWTs using this JWKS endpoint, so `auth.jwt()->>'sub'` in RLS policies automatically matches the Clerk user ID.

### 2.4 Get API keys

1. Supabase → **Project Settings** → **API**
2. Copy:
   - `Project URL` → becomes `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` key → becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → becomes `SUPABASE_SERVICE_ROLE_KEY` (for Worker only!)
3. Add to `frontend/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
   ```

---

## Phase 3: Cloudflare R2 + Worker (~15 min)

### 3.1 Create R2 bucket

1. Cloudflare Dashboard → **R2** → **Create Bucket**
2. Name: `vectorhorizon-world-assets`
3. **Location:** Automatic
4. After creation, go to **Bucket Settings** → **Public Access** → **Enable** (for direct video URLs)
5. Copy the public bucket URL — looks like `https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev`
6. Edit `worker/src/r2.ts` — replace `R2_PUBLIC_BASE` with your actual URL

### 3.2 Set Worker secrets

```bash
cd worker
npx wrangler secret put SUPABASE_URL
# Paste your Supabase Project URL

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your Supabase service_role key

npx wrangler secret put CLERK_JWKS_URL
# Paste your Clerk JWKS URL from Step 1.2

npx wrangler secret put NVIDIA_COSMOS_API_KEY
# Paste your NVIDIA API key (see Phase 4)
```

### 3.3 Deploy Worker

```bash
cd worker
npm install
npx wrangler deploy
```

### 3.4 Get Worker URL

After deploy, `wrangler` prints the URL — looks like:
`https://vectorhorizon-worker.<your-user>.workers.dev`

Add to `frontend/.env.local`:
```
NEXT_PUBLIC_WORKER_URL=https://vectorhorizon-worker.<your-user>.workers.dev
```

---

## Phase 4: NVIDIA Cosmos API (~5 min)

### 4.1 Get API key

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Search for **Cosmos Predict 2.5 Video2World**
3. Click **Get API Key**
4. Copy the key

### 4.2 Set in Worker

```bash
cd worker
npx wrangler secret put NVIDIA_COSMOS_API_KEY
# Paste your NVIDIA key

npx wrangler deploy
```

---

## Phase 5: Vercel Deploy (~5 min)

### 5.1 Connect repo

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. **Root Directory:** `frontend` (NOT the repo root)
4. **Framework:** Next.js (auto-detected)
5. **Build Command:** `next build` (auto-detected)
6. **Output Directory:** `.next` (auto-detected)

### 5.2 Set environment variables

In Vercel project settings → **Environment Variables**, add:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  = pk_live_xxxxxxxxx
CLERK_SECRET_KEY                   = sk_live_xxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL      = /sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL      = /sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = /dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = /dashboard
NEXT_PUBLIC_SUPABASE_URL           = https://xxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY      = eyJxxxxx...
NEXT_PUBLIC_WORKER_URL             = https://vectorhorizon-worker.xxxxxxxxx.workers.dev
NEXT_PUBLIC_APP_URL                = https://vectorhorizon.vercel.app (your Vercel domain)
```

### 5.3 Deploy

1. Click **Deploy**
2. Wait ~2min
3. Open your Vercel URL — landing page should load

---

## Phase 6: Post-Deploy Verification

### 6.1 Test auth flow

1. Visit `https://your-domain.vercel.app`
2. Click **Get Started** → should redirect to Clerk sign-up
3. Create an account
4. Should redirect to `/dashboard` with empty state "No worlds yet"

### 6.2 Test world creation

1. Click **Create Your First World** (or **New World**)
2. Upload a JPEG image
3. Should redirect to `/world/[id]` showing the image in the viewport

### 6.3 Test generation

1. On the world canvas page, press the **up arrow** joystick button
2. Status should change to "Generating forward..." with the loading overlay
3. After ~5-10s, a video should play in the viewport

### 6.4 Verify Supabase

1. Supabase Dashboard → **Table Editor** → `worlds` — should have a row
2. After generation, `world_transitions` — should have a row with `video_url` pointing to R2

### 6.5 Verify R2

1. Cloudflare Dashboard → **R2** → `vectorhorizon-world-assets`
2. Should see uploaded image + generated MP4

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Dashboard shows "No worlds" after creating one | RLS policy not recognizing Clerk JWT | Check Supabase JWT settings → JWKS URL points to Clerk |
| World canvas: "Not authenticated" | Clerk token not being sent to Worker | Check `NEXT_PUBLIC_WORKER_URL` in Vercel env |
| Generation returns error | NVIDIA API key not set or invalid | `cd worker && npx wrangler secret list` to verify |
| Video plays but no `world_transitions` row | Supabase service_role key wrong | Check `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` |
| Upload fails | R2 bucket not public or CORS not configured | Enable public access on R2 bucket |
| Middleware on every route (Vercel bill) | Matcher regex wrong | Verify `frontend/middleware.ts` has explicit matcher |
| Build fails on Vercel | Root directory not set to `frontend/` | Vercel settings → Root Directory = `frontend` |
