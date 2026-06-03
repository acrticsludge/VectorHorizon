import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyAuth } from './auth';
import { uploadToR2, getPublicUrl } from './r2';
import { generateVideo } from './cosmos';
import { createWorld, createTransition, deleteWorld } from './supabase';
import type { Env, GenerationRequest } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://vectorhorizon.vercel.app'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));

app.get('/health', (c) => c.json({ data: { status: 'ok' } }));

app.post('/worlds', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  const body = await c.req.parseBody();
  const imageFile = body['image'] as File | null;
  if (!imageFile) return c.json({ error: 'No image provided' }, 400);
  if (!imageFile.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400);
  if (imageFile.size > 10 * 1024 * 1024) return c.json({ error: 'Image must be under 10MB' }, 400);

  try {
    const imageBuffer = await imageFile.arrayBuffer();
    const r2Key = `worlds/${auth.userId}/${crypto.randomUUID()}-${imageFile.name}`;
    try { await uploadToR2(c.env, r2Key, imageBuffer, imageFile.type); }
    catch (e) { console.error('[worker] R2 upload failed:', e); return c.json({ error: 'R2 upload failed' }, 500); }
    const result = await createWorld(c.env, auth.userId, getPublicUrl(r2Key));
    if ('error' in result) { console.error('[worker] DB createWorld failed:', result.error); return c.json({ error: result.error }, 500); }
    return c.json({ data: { worldId: result.id, imageUrl: getPublicUrl(r2Key) } }, 201);
  } catch (err) { console.error('[worker] Upload catch-all:', err); return c.json({ error: 'Upload failed' }, 500); }
});

// Serve assets from R2 with CORS headers (for browsers that enforce CORS)
app.get('/assets/*', async (c) => {
  const url = new URL(c.req.raw.url);
  const key = url.pathname.replace('/assets/', '');
  if (!key) return c.json({ error: 'Missing asset key' }, 400);

  const object = await c.env.WORLD_ASSETS.get(key);
  if (!object) return c.json({ error: 'Asset not found' }, 404);

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.set('Access-Control-Allow-Origin', '*');
  return c.newResponse(object.body, { headers });
});

app.post('/generate', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  const body: GenerationRequest = await c.req.json();
  const missing: string[] = [];
  if (!body.worldId) missing.push('worldId');
  if (!body.direction) missing.push('direction');
  if (!body.imageBase64) missing.push('imageBase64');
  else if (body.imageBase64.length < 50) return c.json({ error: 'imageBase64 appears truncated or invalid (too short)' }, 400);
  if (missing.length) return c.json({ error: `Missing required fields: ${missing.join(', ')}` }, 400);
  if (!['forward', 'backward', 'left', 'right'].includes(body.direction)) {
    return c.json({ error: 'Invalid direction' }, 400);
  }

  try {
    const directionLabels: Record<string, string> = {
      forward: 'The camera moves forward through the scene, revealing new depth.',
      backward: 'The camera pulls backward, widening the field of view.',
      left: 'The camera pans left, revealing left-side details.',
      right: 'The camera pans right, revealing right-side details.',
    };
    const prompt = body.trajectoryVector || directionLabels[body.direction] || `Camera moves ${body.direction}`;
    const cosmosResult = await generateVideo(c.env, body.imageBase64, prompt);
    if ('error' in cosmosResult) return c.json({ error: cosmosResult.error }, 502);

    // Fetch video from HF Space URL
    const videoResponse = await fetch(cosmosResult.videoUrl);
    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoBinary = new Uint8Array(videoArrayBuffer);
    const videoKey = `transitions/${auth.userId}/${body.worldId}/${crypto.randomUUID()}.mp4`;
    await uploadToR2(c.env, videoKey, videoBinary, 'video/mp4');
    const publicUrl = getPublicUrl(videoKey);

    const transition = await createTransition(c.env, body.worldId, auth.userId, body.direction, publicUrl);
    if ('error' in transition) {
      console.error(`[worker] Orphaned video: ${videoKey}`);
      return c.json({ error: 'Video saved but transition unlogged' }, 500);
    }

    return c.json({ data: { videoUrl: publicUrl, transitionId: transition.id } }, 201);
  } catch (err) { return c.json({ error: 'Generation failed' }, 500); }
});

app.get('/worlds', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase.from('worlds').select('id, name, initial_image_url, created_at').eq('user_id', auth.userId).order('created_at', { ascending: false });
    if (error) return c.json({ error: 'Failed to fetch worlds' }, 500);
    return c.json({ data }, 200);
  } catch (err) { return c.json({ error: 'Database error' }, 500); }
});

app.delete('/worlds/:id', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  const worldId = c.req.param('id');
  const result = await deleteWorld(c.env, worldId, auth.userId);
  if (result && 'error' in result) {
    const status = result.error === 'Forbidden' ? 403 : result.error === 'World not found' ? 404 : 500;
    return c.json({ error: result.error }, status);
  }
  return c.json({ data: { deleted: true } }, 200);
});

export default app;
