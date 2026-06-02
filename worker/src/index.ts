import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyAuth } from './auth';
import { uploadToR2, getPublicUrl } from './r2';
import { generateVideo } from './cosmos';
import { createWorld, createTransition } from './supabase';
import type { Env, GenerationRequest } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://vectorhorizon.vercel.app'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
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
    await uploadToR2(c.env, r2Key, imageBuffer, imageFile.type);
    const result = await createWorld(c.env, auth.userId, getPublicUrl(r2Key));
    if ('error' in result) return c.json({ error: result.error }, 500);
    return c.json({ data: { worldId: result.id, imageUrl: getPublicUrl(r2Key) } }, 201);
  } catch (err) { return c.json({ error: 'Upload failed' }, 500); }
});

app.post('/generate', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  const body: GenerationRequest = await c.req.json();
  if (!body.worldId || !body.direction || !body.imageBase64) {
    return c.json({ error: 'Missing required fields: worldId, direction, imageBase64' }, 400);
  }
  if (!['forward', 'backward', 'left', 'right'].includes(body.direction)) {
    return c.json({ error: 'Invalid direction' }, 400);
  }

  try {
    const cosmosResult = await generateVideo(c.env, body.imageBase64, body.trajectoryVector);
    if ('error' in cosmosResult) return c.json({ error: cosmosResult.error }, 502);

    // Decode base64 video → binary
    const videoBinary = Uint8Array.from(atob(cosmosResult.videoBase64), (c) => c.charCodeAt(0));
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

export default app;
