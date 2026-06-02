# CLAUDE.local.md — VectorHorizon Project Reference

## Project: Semantic World-Builder

Turn static 2D images into physically consistent 3D video environments via NVIDIA Cosmos 3. Users upload an image, use a virtual joystick to "drive" through it. Cosmos generates 3-second MP4s per direction. Persisted to Supabase, stored in Cloudflare R2.

## Structure

```
frontend/     ← Next.js 16 App Router (Vercel Hobby, static-optimized)
worker/       ← Cloudflare Worker (Hono router, all API logic)
```

**Critical:** Zero Vercel API routes. ALL backend calls route to the Cloudflare Worker. This eliminates Vercel serverless compute costs.

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Auth | Clerk | JWT templates for Supabase RLS |
| DB | Supabase Postgres | RLS enforced, user_id from `auth.jwt()->>'sub'` |
| Storage | Cloudflare R2 | Zero egress, presigned uploads |
| AI | NVIDIA Cosmos 3 NIM | Physical AI video generation |
| Worker | Cloudflare Workers + Hono | JWT verify (jose), API orchestration |
| Frontend | Next.js App Router | Server Components by default |

## DB Schema

- `worlds` — user_id, name, initial_image_url, created_at
- `world_transitions` — world_id, user_id, direction, video_url, created_at

RLS: `auth.jwt()->>'sub' = user_id` on both tables. Worker uses service role key (bypasses RLS) but gates via Clerk JWT verification.

## Key Architecture Decisions

1. **No Infinite Horizon chaining in MVP** — single generation per direction, static baseline image
2. **4-direction joystick** — forward/backward/left/right (no orbit, no analog delta)
3. **Video crossfade** — double-buffered `<video>` elements with 300ms CSS opacity transition
4. **Input queue** — 200ms debounce, max 1 pending direction, AbortController cancels in-flight
5. **Middleware matcher** — `/dashboard/:path*`, `/world/:path*` ONLY (no explosion)
6. **Server Components by default** — only CanvasViewport + JoystickOverlay + ImageUploader are `"use client"`

## Env Vars Required

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# Worker
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
CLERK_JWKS_URL (e.g., https://<domain>.clerk.accounts.dev/.well-known/jwks.json)
NVAPI_KEY, COSMOS_API_URL

# R2
WORLD_ASSETS (binding name in wrangler.toml)

# Frontend
NEXT_PUBLIC_WORKER_URL
```

## Checklists to Run Before Ship

Performance, Mobile, Error Handling, API Security (all in `.opencode/skills/`).

## Known Gotchas

- Vercel middleware MUST have explicit matcher or Fluid CPU bills explode
- Supabase anon key on frontend (RLS-gated), service role key in worker only
- jose package for JWT verification (not jsonwebtoken — jose is Edge-compatible)
- Cosmos returns full MP4, not streamed — budget 3-5s latency per generation
- R2 video URLs are returned as keys (need public bucket or proxy route)
