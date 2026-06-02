// Client-side Supabase client with Clerk JWT integration
'use client';
import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      accessToken: async () => {
        // Clerk session token used for Supabase RLS
        return (window as any).Clerk?.session?.getToken() ?? null;
      },
    }
  );
  return client;
}
