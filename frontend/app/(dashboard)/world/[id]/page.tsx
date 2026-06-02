// Canvas experience page. Stitch generates the viewport + joystick UI.
// This page handles ALL logic: video playback, generation, state machine.
// Stitch component expected props: state, initialImageUrl, videoUrl, onDirection, isGenerating, errorMessage
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { useCanvasEngine } from '@/lib/hooks/useCanvasEngine';
import { useJoystickController } from '@/lib/hooks/useJoystickController';
import type { TrajectoryDirection } from '@/lib/types/world';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function WorldCanvasPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const engine = useCanvasEngine();

  const [initialImageUrl, setInitialImageUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [currentFrameBase64, setCurrentFrameBase64] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load world metadata from Supabase
  useEffect(() => {
    async function load() {
      if (!params.id || params.id === 'new') return;
      const token = await getToken({ template: 'supabase' });
      if (!token) return;
      const { data } = await supabase.from('worlds').select('*').eq('id', params.id).single();
      if (data) {
        setInitialImageUrl(data.initial_image_url);
        setLoaded(true);
      }
    }
    load();
  }, [params.id, getToken]);

  const onStart = useCallback((dir: TrajectoryDirection) => engine.setGenerating(dir), [engine]);
  const onComplete = useCallback((dir: TrajectoryDirection, url: string) => {
    engine.playVideo({ url, direction: dir, id: `${Date.now()}` });
  }, [engine]);
  const onError = useCallback((msg: string) => { engine.setError(msg); setToastMessage(msg); }, [engine]);

  const joystick = useJoystickController({
    worldId: params.id || '',
    currentFrameBase64,
    onGenerationStart: onStart,
    onGenerationComplete: onComplete,
    onCollision: (dir) => { engine.setCollision(dir); setToastMessage(`Cannot move ${dir}`); setTimeout(() => setToastMessage(null), 2000); },
    onError,
  });

  const status = engine.state.status;

  if (!loaded) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      {/* TODO: Replace with <StitchCanvasPage ... /> */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">World Canvas</h1>
        <span className="text-sm text-zinc-500">
          {status === 'generating' ? `Generating ${(engine.state as any).direction}...` : status === 'playing' ? 'Playing' : 'Ready'}
        </span>
      </div>

      {/* Viewport — Stitch will replace this */}
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-950">
        {initialImageUrl && status === 'idle' && (
          <img src={initialImageUrl} alt="World" className="h-full w-full object-cover" />
        )}
        {engine.currentVideo && (
          <video ref={engine.currentRef} src={engine.currentVideo.url} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline muted onEnded={engine.handleVideoEnded} />
        )}
        {status === 'generating' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}
      </div>

      {/* Joystick — Stitch will replace this */}
      <div className="mt-4 flex justify-center gap-4">
        {(['forward', 'backward', 'left', 'right'] as TrajectoryDirection[]).map((dir) => (
          <button
            key={dir}
            onClick={() => joystick.handleDirection(dir)}
            disabled={joystick.isGenerating}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
            aria-label={dir}
          >
            {dir === 'forward' ? '↑' : dir === 'backward' ? '↓' : dir === 'left' ? '←' : '→'}
          </button>
        ))}
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-200 dark:text-zinc-900">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
