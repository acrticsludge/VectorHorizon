'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useCanvasEngine } from '@/lib/hooks/useCanvasEngine';
import { useJoystickController } from '@/lib/hooks/useJoystickController';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ShimmerSkeleton } from '@/components/layout/ShimmerSkeleton';
import type { TrajectoryDirection } from '@/lib/types/world';

// Raw DB row shape (snake_case from Supabase)
interface WorldRow {
  id: string;
  user_id: string;
  name: string;
  initial_image_url: string;
  created_at: string;
}

const dirMap: Record<string, TrajectoryDirection> = {
  up: 'forward',
  down: 'backward',
  left: 'left',
  right: 'right',
};

export default function WorldCanvasPage() {
  const params = useParams<{ id: string }>();
  const {
    state,
    currentVideo,
    nextVideo,
    currentRef,
    nextRef,
    isTransitioning,
    playVideo,
    setGenerating,
    setError,
    setCollision,
    handleVideoEnded,
  } = useCanvasEngine();

  const [initialImageUrl, setInitialImageUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [currentFrameBase64, setCurrentFrameBase64] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Convert initial image to base64 when it loads
  useEffect(() => {
    if (!initialImageUrl) return;
    fetch(initialImageUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setCurrentFrameBase64(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => {}); // silently fail — generation will show a clear error
  }, [initialImageUrl]);

  useEffect(() => {
    async function load() {
      if (!params.id || params.id === 'new') return;
      const { data } = await getSupabase()
        .from('worlds')
        .select('*')
        .eq('id', params.id)
        .single();
      if (data) {
        setInitialImageUrl((data as WorldRow).initial_image_url);
        setLoaded(true);
      }
    }
    load();
  }, [params.id]);

  const onStart = useCallback((dir: TrajectoryDirection) => setGenerating(dir), [setGenerating]);
  const onComplete = useCallback((dir: TrajectoryDirection, url: string) => {
    playVideo({ url, direction: dir, id: `${Date.now()}` });
  }, [playVideo]);
  const onError = useCallback((msg: string) => {
    setError(msg);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, [setError]);

  const joystick = useJoystickController({
    worldId: params.id || '',
    currentFrameBase64,
    onGenerationStart: onStart,
    onGenerationComplete: onComplete,
    onCollision: (dir) => {
      setCollision(dir);
      setToastMessage(`Cannot move ${dir} - boundary reached`);
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

  const status = state.status;
  const direction = status === 'generating' ? (state as { direction: TrajectoryDirection }).direction : null;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#0e0e10]">
        <Navbar />
        <Sidebar />
        <main className="flex items-center justify-center mt-16 lg:ml-64 lg:w-[calc(100%-16rem)] p-6 h-[calc(100dvh-64px)]">
          <ShimmerSkeleton variant="viewport" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e10] text-[#e5e1e4] overflow-hidden">
      <Navbar />
      <Sidebar />

      <main className="flex-grow flex items-center justify-center p-[16px] lg:p-6 relative mt-16 lg:ml-64 lg:w-[calc(100%-16rem)] min-w-0">
        <div className="relative w-full max-w-[1200px] max-h-[calc(100dvh-7rem)] aspect-video bg-[#131315] rounded-lg border border-[#27272a] overflow-hidden group">
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

            {currentVideo && (
              <video
                ref={currentRef}
                src={currentVideo.url}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                autoPlay
                playsInline
                muted
                onEnded={handleVideoEnded}
              />
            )}

            {nextVideo && (
              <video
                ref={nextRef}
                src={nextVideo.url}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
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

          <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-40">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[#131315]/80 border border-[#27272a]/30 flex items-center justify-center">
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
                  className={`joystick-btn absolute ${pos} w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-[#2a2a2c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
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
            <div className="max-w-[calc(100vw-2rem)] bg-[#93000a] text-white px-4 sm:px-6 py-3 rounded border border-red-500/20 flex items-center gap-3 shadow-lg">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="text-[14px] leading-[1.6] font-medium">{toastMessage || ''}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
