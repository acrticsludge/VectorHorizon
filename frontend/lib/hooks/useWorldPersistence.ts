'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import type { World } from '@/lib/types/world';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useWorldPersistence() {
  const { getToken } = useAuth();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorlds = useCallback(async () => {
    const token = await getToken({ template: 'supabase' });
    if (!token) return;
    const { data, error } = await supabase
      .from('worlds')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setWorlds(data as World[]);
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchWorlds();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchWorlds]);

  return { worlds, loading, refresh: fetchWorlds };
}
