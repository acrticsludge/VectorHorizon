# Lessons

## 2026-06-03: [Architecture] `@gradio/client` incompatible with Cloudflare Workers — use raw HTTP to Gradio SSE v3 API

**What happened:** `@gradio/client` (Gradio's official JS client) throws runtime errors when used in Cloudflare Workers — `process.versions.node` is undefined, `path.resolve()` doesn't exist in Workers runtime.

**Root cause:** `@gradio/client` is designed for Node.js/browser runtimes where `process`, `path`, and other Node.js globals are available. Cloudflare Workers use a V8-isolated runtime without Node.js APIs.

**Fix:** Rewrote `cosmos.ts` to use raw `fetch()` calls to the Gradio SSE v3 API:
1. Upload image to `POST /gradio_api/upload` (multipart form data)
2. Call generation via `POST /gradio_api/call/v2/generate` with 11 named JSON params
3. Poll SSE result via `GET /gradio_api/call/generate/{event_id}` and parse SSE events for `process_completed`
4. Extract video `FileData.path` or `FileData.url` from `data.data[1]` (second return value)

**Prevention:** Before adding NPM packages to a Workers project, check if they depend on Node.js built-in modules (process, path, fs, crypto, etc.). For Gradio Spaces, raw HTTP fetch to the SSE v3 API is the correct pattern — it works in any runtime that supports `fetch`, `FormData`, `Blob`, and `atob`.

## 2026-06-02: [Bug] R2 CORS missing causes cascade failure (generate 400)

**What happened:** Joystick generate returned 400 "Missing required fields: imageBase64" even though world loaded successfully.

**Root cause:** World canvas fetches the initial image from R2 public URL (`pub-*.r2.dev`) to convert to base64 for the Cosmos API. R2 public buckets don't send `Access-Control-Allow-Origin` headers by default. Browser CORS blocks the fetch → `currentFrameBase64` stays empty string → Worker rejects with 400.

**Fix:** Two-part fix:
1. Worker: Added `GET /assets/*` route that serves R2 files through the Worker with explicit CORS headers (using `WORLD_ASSETS` binding)
2. Frontend: `WorldCanvasPage` converts R2 public URLs to Worker proxy URLs for CORS-safe fetching
3. Frontend: `useJoystickController` now guards against empty `currentFrameBase64` with a user-facing error

**Prevention:** Any code that fetches from R2 public URLs in the browser needs either (a) R2 bucket CORS configuration via Cloudflare Dashboard, or (b) Worker proxy with CORS headers. Videos in `<video src>` tags don't need CORS for basic playback, but `fetch()` and canvas operations do.

## 2026-06-02: [Deployment] `output: 'standalone'` breaks Vercel

**What happened:** Vercel deployment succeeded but returned 404 on every route.

**Root cause:** `next.config.ts` had `output: 'standalone'`. This config is for Docker/custom Node.js servers. Vercel's Next.js builder uses its own output pipeline — setting `standalone` produces a wrong output structure → all routes 404.

**Fix:** Remove `output: 'standalone'` from `next.config.ts`.

**Prevention:** Never set `output` in `next.config.ts` when deploying to Vercel. Only use it for Docker/self-hosted deployments.
