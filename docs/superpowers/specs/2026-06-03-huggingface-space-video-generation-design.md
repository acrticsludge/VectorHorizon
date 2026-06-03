# HF Space Video Generation Integration

**Date:** 2026-06-03
**Status:** Design Approved
**Author:** AI (Brainstorming Session)

## Problem

The Cloudflare Worker's `/generate` endpoint calls NVIDIA's hosted Cosmos API at
`https://integrate.api.nvidia.com/v1/videos/sync`, but the configured API key
(`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`)
lacks entitlements for Cosmos video generation. The endpoint returns 502 (Bad
Gateway) on every request. No alternative video generation service has been
configured.

## Solution

Replace the NVIDIA hosted API with the Hugging Face Space
`multimodalart/Cosmos3-Nano`, using `@gradio/client` (Gradio's official
JavaScript/TypeScript npm package) in the Cloudflare Worker.

## Architecture

```
Frontend                    Worker (Cloudflare)              Hugging Face Space
                              │                                    │
POST /generate                │                                    │
  { worldId, direction,       │                                    │
    imageBase64 }             │                                    │
         │                    │                                    │
         ▼                    │                                    │
    (spinner) ───→ /generate  │                                    │
                              │  verifyAuth()                      │
                              │  validate body                     │
                              │  generateVideo() ─────────────────→│
                              │    @gradio/client                  │  /predict
                              │    Client.connect()                │  { prompt,
                              │    predict("/predict", ...)         │    mode: "Video",
                              │                                    │    conditioningImage,
                              │    ←── video URL ─────────────────│    generateAudio: false,
                              │                                    │    seed: 0 }
                              │  fetch(videoUrl)                   │
                              │  uploadToR2(videoBinary)           │
                              │  createTransition(...)             │
                              │                                    │
         ◄────────────────────│── { videoUrl, transitionId }       │
```

### Key Changes

| Component | Before | After |
|-----------|--------|-------|
| Video API | NVIDIA Cosmos Hosted API | HF Space `multimodalart/Cosmos3-Nano` |
| Client library | Raw `fetch()` POST | `@gradio/client` (npm package) |
| Image input | Base64 in JSON body | Base64 → Blob → `handle_file(blob)` |
| Video output | `{ b64_video, seed }` JSON | File URL → fetch → R2 upload |
| Auth | `NVIDIA_COSMOS_API_KEY` header | None (public Space) |

## Module Design: `worker/src/cosmos.ts`

Fully rewritten. The new module:

1. **Connects** to `multimodalart/Cosmos3-Nano` via `Client.connect()` (no auth token needed)
2. **Converts** `inputImageBase64` to a `Blob` and wraps it with `handle_file()` for Gradio
3. **Calls** `predict("/predict", ...)` with 5 parameters matching the Space's UI components:
   - `prompt: string` — trajectory description (e.g., "The camera moves forward...")
   - `mode: string` — `"Video"` (not "Image to Video" or other modes)
   - `conditioningImage: FileData | null` — the uploaded image blob via `handle_file()`
   - `generateAudio: boolean` — `false`
   - `seed: number` — `0`
4. **Extracts** the video file URL from `result.data[0]`
5. **Returns** `{ videoUrl: string }` or `{ error: string }`

### Fallback parameter format

If the object-key payload format doesn't match the Space's expected schema, fall
back to array-positional syntax:

```typescript
app.predict("/predict", [prompt, "Video", handle_file(blob), false, 0])
```

## Route Changes: `worker/src/index.ts`

The `POST /generate` handler changes minimally:

1. **After `generateVideo()` returns `{ videoUrl }`** (instead of `{ videoBase64 }`):
2. **Download** the video from the HF ephemeral URL: `fetch(videoUrl) → ArrayBuffer`
3. **Upload** binary to R2 (same as before)
4. **Create transition** in Supabase (same as before)
5. **Return** `{ videoUrl: r2Url, transitionId }` (same response shape)

### Before (current)
```typescript
const cosmosResult = await generateVideo(env, imageBase64, prompt);
// → { videoBase64: "..." }
const videoBinary = Uint8Array.from(atob(cosmosResult.videoBase64), ...);
await uploadToR2(env, videoKey, videoBinary, 'video/mp4');
```

### After (new)
```typescript
const cosmosResult = await generateVideo(env, imageBase64, prompt);
// → { videoUrl: "https://*.hf.space/file=..." }
const response = await fetch(cosmosResult.videoUrl);
const videoBinary = await response.arrayBuffer();
await uploadToR2(env, videoKey, videoBinary, 'video/mp4');
```

## Configuration

### `worker/package.json`
```json
{
  "dependencies": {
    "@gradio/client": "^1.0.0"
  }
}
```

### `worker/wrangler.toml`
Remove `NVIDIA_COSMOS_BASE_URL` var — no longer needed.

### Secrets to delete
- `NVIDIA_COSMOS_API_KEY` — no longer used (run `wrangler secret delete NVIDIA_COSMOS_API_KEY`)

### No new env vars needed
- Space name is hardcoded: `"multimodalart/Cosmos3-Nano"`
- Space is public: no HF token required

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `worker/src/cosmos.ts` | **Rewrite** | Replace NVIDIA API with `@gradio/client` → HF Space |
| `worker/src/index.ts` | **Edit** | Replace base64 decode with video download + R2 upload |
| `worker/src/types.ts` | **Edit** | Remove `NVIDIA_COSMOS_API_KEY`, `NVIDIA_COSMOS_BASE_URL` from `Env` type |
| `worker/package.json` | **Edit** | Add `@gradio/client` dependency |
| `worker/wrangler.toml` | **Edit** | Remove `NVIDIA_COSMOS_BASE_URL` |
| *(frontend)* | — | No changes needed (API contract preserved) |

## Error Handling

| Scenario | Behavior | User-Facing Message |
|----------|----------|---------------------|
| Space cold-start | `Client.connect()` slow (30-60s). Wait up to 120s. | Transparent (spinner shown) |
| Space busy/queued | Predict resolves after queue wait | Transparent |
| Space returns error | Catch from predict rejection | `"Video generation failed: {message}"` |
| Empty result | Check `result.data[0]` | `"Space returned no video file"` |
| Video download fails | Fetch HF URL fails | `"Generated video could not be downloaded"` |
| `@gradio/client` error | Caught, logged | `"Generation service error"` |

## Timeout Strategy

Cloudflare Workers have execution time limits:
- **Free plan:** 10ms CPU time — insufficient
- **Paid Workers ($5/mo):** 30s wall clock — *may* be insufficient for Cosmos
  generation (potentially 30-120s)
- **Unbound Workers:** 15-minute wall clock — sufficient

**Decision:** Pending HF Space speed test. If the Space responds within 30s,
the current Workers plan is sufficient. If slower, switch to Unbound or add a
polling pattern.

Approach priority:
1. Test actual HF Space response time first
2. If ≤30s: keep current Workers plan
3. If 30-120s: switch to Unbound Workers
4. If >120s or consistent failures: add polling via Durable Object / Queue

## Testing

1. **Unit**: `cosmos.ts` returns correct shape (`{ videoUrl }` or `{ error }`)
2. **Integration**: Call `POST /generate` with a real image → verify video stored
   in R2 and transition created in Supabase
3. **Speed test**: Measure time from predict call to video URL response from HF Space

## Rollback

To revert to the old behavior: restore `cosmos.ts`, `index.ts`, and `types.ts`
from git. The `@gradio/client` dependency can be removed from `package.json`.

## Future Considerations

- If the HF Space requires authentication, add `HF_TOKEN` as a Worker secret and
  pass it to `Client.connect(SPACE_NAME, { auth: token })`
- If the Space is deprecated, swap to a different Space (same Gradio interface)
  or an alternative video gen service
- The polling pattern (Durable Object) can be added later if timeout becomes an
  issue without changing the frontend API contract
