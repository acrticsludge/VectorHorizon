# Lessons

## 2026-06-02: [Deployment] `output: 'standalone'` breaks Vercel

**What happened:** Vercel deployment succeeded but returned 404 on every route.

**Root cause:** `next.config.ts` had `output: 'standalone'`. This config is for Docker/custom Node.js servers. Vercel's Next.js builder uses its own output pipeline — setting `standalone` produces a wrong output structure → all routes 404.

**Fix:** Remove `output: 'standalone'` from `next.config.ts`.

**Prevention:** Never set `output` in `next.config.ts` when deploying to Vercel. Only use it for Docker/self-hosted deployments.
