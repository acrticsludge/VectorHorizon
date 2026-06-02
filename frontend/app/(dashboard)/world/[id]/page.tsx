'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { useCanvasEngine } from '@/lib/hooks/useCanvasEngine';
import { useJoystickController } from '@/lib/hooks/useJoystickController';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ShimmerSkeleton } from '@/components/layout/ShimmerSkeleton';
import type { TrajectoryDirection } from '@/lib/types/world';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const dirMap: Record<string, TrajectoryDirection> = {
  up: 'forward',
  down: 'backward',
  left: 'left',
  right: 'right',
};

export default function WorldCanvasPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const engine = useCanvasEngine();

  const [initialImageUrl, setInitialImageUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [currentFrameBase64, setCurrentFrameBase64] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!params.id || params.id === 'new') return;
      const token = await getToken({ template: 'supabase' });
      if (!token) return;
      const { data } = await supabase
        .from('worlds')
        .select('*')
        .eq('id', params.id)
        .single();
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
  const onError = useCallback((msg: string) => {
    engine.setError(msg);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, [engine]);

  const joystick = useJoystickController({
    worldId: params.id || '',
    currentFrameBase64,
    onGenerationStart: onStart,
    onGenerationComplete: onComplete,
    onCollision: (dir) => {
      engine.setCollision(dir);
      setToastMessage(`Cannot move ${dir} — boundary reached`);
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (joystick.isGenerating) return;
      if (e.key === 'ArrowUp') joystick.handleDirection('forward');
      if (e.key === 'ArrowRight') joystick.handleDirection('right');
      if (e.key === 'ArrowDown') joystick.handleDirection('backward');
      if (e.key === 'ArrowLeft') joystick.handleDirection('left');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [joystick]);

  const status = engine.state.status;
  const direction = status === 'generating' ? (engine.state as { direction: TrajectoryDirection }).direction : null;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#0e0e10]">
        <Navbar />
        <Sidebar />
        <main className="flex items-center justify-center mt-16 lg:ml-64 p-6 h-[calc(100vh-64px)]">
          <ShimmerSkeleton variant="viewport" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e10] text-[#e5e1e4] overflow-hidden">
      <Navbar />
      <Sidebar />

      <main className="flex-grow flex items-center justify-center p-[16px] lg:p-6 relative mt-16 lg:ml-64">
        <div className="relative w-full max-w-[1200px] aspect-video bg-[#131315] rounded-lg border border-[#27272a] overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
            <div className="flex flex-col gap-1 pointer-events-auto">
              <h1 className="text-[18px] leading-[1.4] font-medium text-white">World Canvas</h1>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'generating' ? 'bg-[#8e9192] generating-pulse' : 'bg-white'}`} />
                <span className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-[#a1a1aa]">
                  {status === 'idle' ? 'Ready' :
                   status === 'generating' && direction ? `Generating ${direction}...` :
                   status === 'playing' ? 'Playing' :
                   status === 'error' ? 'Error' : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {status === 'idle' && initialImageUrl && (
              <img src={initialImageUrl} alt="World environment" className="w-full h-full object-cover transition-all duration-700" />
            )}

            {engine.currentVideo && (
              <video
                ref={engine.currentRef}
                src={engine.currentVideo.url}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${engine.isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                autoPlay
                playsInline
                muted
                onEnded={engine.handleVideoEnded}
              />
            )}

            {engine.nextVideo && (
              <video
                ref={engine.nextRef}
                src={engine.nextVideo.url}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${engine.isTransitioning ? 'opacity-100' : 'opacity-0'}`}
                autoPlay
                playsInline
                muted
              />
            )}

            {status === 'generating' && (
              <div className="absolute inset-0 bg-[#131315]/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
                <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-white">Synthesizing Geometry</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 right-6 z-40">
            <div className="relative w-40 h-40 rounded-full bg-[#131315]/80 border border-[#27272a]/30 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#8e9192]" />

              {[
                { dir: 'up', label: 'forward', icon: 'arrow_upward', pos: 'top-1 left-1/2 -translate-x-1/2' },
                { dir: 'right', label: 'right', icon: 'arrow_forward', pos: 'right-1 top-1/2 -translate-y-1/2' },
                { dir: 'down', label: 'backward', icon: 'arrow_downward', pos: 'bottom-1 left-1/2 -translate-x-1/2' },
                { dir: 'left', label: 'left', icon: 'arrow_back', pos: 'left-1 top-1/2 -translate-y-1/2' },
              ].map(({ dir, label, icon, pos }) => (
                <button
                  key={dir}
                  onClick={() => joystick.handleDirection(dirMap[dir])}
                  disabled={joystick.isGenerating}
                  aria-label={label}
                  className={`joystick-btn absolute ${pos} w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#2a2a2c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="material-symbols-outlined text-[#a1a1aa]">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
              toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            <div className="bg-[#93000a] text-white px-6 py-3 rounded border border-red-500/20 flex items-center gap-3 shadow-lg">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="text-[14px] leading-[1.6] font-medium">{toastMessage || ''}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
