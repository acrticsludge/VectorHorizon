'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteWorld } from '@/lib/api/worker';

interface WorldCardProps {
  world: {
    id: string;
    name: string;
    initial_image_url: string;
    created_at: string;
  };
}

export function WorldCard({ world }: WorldCardProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const date = new Date(world.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    const result = await deleteWorld(world.id);
    if (result.error) {
      alert(result.error);
      setConfirming(false);
      setDeleting(false);
    } else {
      router.refresh();
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  };

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
            {confirming ? (
              <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                <button
                  className="text-[11px] leading-none px-2 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-500 transition-colors"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? '...' : 'Delete'}
                </button>
                <button
                  className="text-[11px] leading-none px-2 py-1 rounded bg-[#27272a] text-[#a1a1aa] font-medium hover:text-white transition-colors"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="material-symbols-outlined text-[#a1a1aa] hover:text-white transition-colors"
                aria-label="Delete world"
                onClick={handleDelete}
              >
                delete
              </button>
            )}
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
