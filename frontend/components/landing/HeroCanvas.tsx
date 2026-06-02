'use client';

import { useEffect, useRef } from 'react';

export function HeroCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.backgroundImage = `radial-gradient(circle at ${x}px ${y}px, #18181b 0%, #09090b 100%)`;
    };
    el.addEventListener('mousemove', handleMove);
    return () => el.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className="md:col-span-7 relative group">
      <div
        ref={canvasRef}
        className="aspect-video w-full bg-zinc-900 rounded-xl border border-[#27272a] overflow-hidden relative"
        style={{
          backgroundImage: 'linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        <div className="absolute inset-4 border border-zinc-800/50 rounded-lg flex items-center justify-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-[#27272a] group-hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>
              play_arrow
            </span>
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
            <div className="bg-zinc-950 border border-zinc-800 p-4 w-48 space-y-2">
              <div className="text-zinc-500 text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase">Parameters</div>
              <div className="h-1 bg-zinc-800 w-full rounded-full">
                <div className="h-1 bg-white w-2/3 rounded-full"></div>
              </div>
              <div className="flex justify-between text-[13px] leading-[1.5] text-zinc-400">
                <span>Depth</span>
                <span className="text-white">0.84</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-zinc-950 border border-zinc-800 p-2"><span className="material-symbols-outlined text-zinc-400 text-sm">settings</span></div>
              <div className="bg-zinc-950 border border-zinc-800 p-2"><span className="material-symbols-outlined text-zinc-400 text-sm">layers</span></div>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium text-zinc-300">LIVE FEED</span>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -right-4 w-64 h-32 border border-zinc-700 bg-zinc-950 p-4 hidden lg:block">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
          </div>
          <div className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium text-white">Source: upload_yours.jpg</div>
        </div>
        <div className="space-y-1">
          <div className="h-1 bg-zinc-900 w-full"></div>
          <div className="h-1 bg-zinc-900 w-3/4"></div>
          <div className="h-1 bg-zinc-900 w-5/6"></div>
        </div>
      </div>
    </div>
  );
}
