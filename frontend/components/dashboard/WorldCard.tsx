'use client';

import Link from 'next/link';

interface WorldCardProps {
  world: {
    id: string;
    name: string;
    initial_image_url: string;
    created_at: string;
  };
}

export function WorldCard({ world }: WorldCardProps) {
  const date = new Date(world.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={`/world/${world.id}`}>
      <div className="group flex flex-col gap-3 p-2 rounded-lg bg-[#1c1b1d] border border-[#27272a] hover:border-[#52525b] transition-all duration-300 cursor-pointer">
        <div className="aspect-video w-full overflow-hidden rounded bg-[#2a2a2c] relative">
          <img
            src={world.initial_image_url}
            alt={world.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-4xl">play_circle</span>
          </div>
        </div>
        <div className="flex flex-col px-1 pb-1">
          <div className="flex justify-between items-start">
            <h3 className="text-[18px] leading-[1.4] font-medium text-white group-hover:text-white transition-colors">{world.name}</h3>
            <button
              className="material-symbols-outlined text-[#a1a1aa] hover:text-white transition-colors"
              aria-label="More options"
              onClick={(e) => e.preventDefault()}
            >
              more_vert
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-[#a1a1aa]">
              Created {date}
            </span>
            <span className="h-1 w-1 rounded-full bg-[#27272a]" />
            <span className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-zinc-500">READY</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
