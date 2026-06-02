import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { ShimmerSkeleton } from '@/components/layout/ShimmerSkeleton';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

function WorldCard({ world }: { world: { id: string; name: string; initial_image_url: string; created_at: string } }) {
  const date = new Date(world.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            <button className="material-symbols-outlined text-[#a1a1aa] hover:text-white transition-colors" aria-label="More options" onClick={(e) => e.preventDefault()}>more_vert</button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-[#a1a1aa]">Created {date}</span>
            <span className="h-1 w-1 rounded-full bg-[#27272a]"></span>
            <span className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-zinc-500">READY</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

async function WorldsGrid() {
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    }
  );

  const { data: worlds, error } = await supabase
    .from('worlds')
    .select('id, name, initial_image_url, created_at')
    .order('created_at', { ascending: false });

  if (error || !worlds || worlds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-[16px] text-center border border-dashed border-[#27272a] rounded-xl bg-[#0e0e10]">
        <div className="mb-6 p-6 rounded-full bg-[#2a2a2c] text-zinc-600">
          <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>language</span>
        </div>
        <h2 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-medium text-white mb-2">No worlds yet</h2>
        <p className="max-w-md text-[14px] leading-[1.6] text-[#a1a1aa] mb-8">
          Upload an image and start exploring. Your generated worlds will appear here.
        </p>
        <Link
          href="/world/new"
          className="bg-white text-black text-[12px] leading-[1.0] tracking-[0.05em] font-medium px-8 py-4 rounded flex items-center justify-center gap-3 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined">rocket_launch</span>
          Create Your First World
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {worlds.map((w) => (
        <WorldCard key={w.id} world={w} />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e10] text-[#e5e1e4]">
      <Navbar />
      <Sidebar />
      <main className="flex-1 mt-16 lg:ml-64 p-[16px] md:p-6 flex flex-col gap-6 relative">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-medium text-white">My Worlds</h1>
            <p className="text-[14px] leading-[1.6] text-[#a1a1aa]">Manage and explore your generated environments.</p>
          </div>
          <Link
            href="/world/new"
            className="bg-white text-black text-[12px] leading-[1.0] tracking-[0.05em] font-medium px-6 h-10 rounded flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New World
          </Link>
        </section>

        <div className="h-px w-full bg-[#27272a] opacity-50 relative z-10"></div>

        <div className="flex-1 relative z-10">
          <Suspense fallback={<ShimmerSkeleton variant="card" count={3} />}>
            <WorldsGrid />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
