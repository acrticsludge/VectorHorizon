import { createClient } from '@supabase/supabase-js';
import type { Env } from './types';

function getDb(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createWorld(env: Env, userId: string, imageUrl: string, name?: string): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await getDb(env).from('worlds').insert({ user_id: userId, name: name || 'My World', initial_image_url: imageUrl }).select('id').single();
    if (error) return { error: error.message };
    return { id: data.id };
  } catch (err) { return { error: 'Database error' }; }
}

export async function createTransition(env: Env, worldId: string, userId: string, direction: string, videoUrl: string): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await getDb(env).from('world_transitions').insert({ world_id: worldId, user_id: userId, direction, video_url: videoUrl }).select('id').single();
    if (error) return { error: error.message };
    return { id: data.id };
  } catch (err) { return { error: 'Database error' }; }
}

export async function deleteWorld(env: Env, worldId: string, userId: string): Promise<null | { error: string }> {
  try {
    // Verify ownership
    const { data: world } = await getDb(env).from('worlds').select('user_id').eq('id', worldId).single();
    if (!world) return { error: 'World not found' };
    if (world.user_id !== userId) return { error: 'Forbidden' };

    // Delete transitions first (foreign key), then world
    const { error: tErr } = await getDb(env).from('world_transitions').delete().eq('world_id', worldId);
    if (tErr) return { error: tErr.message };

    const { error: wErr } = await getDb(env).from('worlds').delete().eq('id', worldId);
    if (wErr) return { error: wErr.message };

    return null;
  } catch (err) { return { error: 'Database error' }; }
}
