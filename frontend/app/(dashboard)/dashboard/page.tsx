import { Suspense } from 'react';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { ShimmerSkeleton } from '@/components/layout/ShimmerSkeleton';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WorldCard } from '@/components/dashboard/WorldCard';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787';

async function WorldsGrid() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  let worlds: { id: string; name: string; initial_image_url: string; created_at: string }[] = [];
  try {
    const res = await fetch(`${WORKER_URL}/worlds`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    const body = await res.json();
    worlds = body.data || [];
  } catch {
    // Worker unreachable — show empty state
  }

  if (worlds.length === 0) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 min-w-0">
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
      <main className="dashboard-route-panel flex-1 mt-16 lg:ml-64 lg:w-[calc(100%-16rem)] p-[16px] md:p-6 flex flex-col gap-6 relative">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-medium text-white">My Worlds</h1>
            <p className="text-[14px] leading-[1.6] text-[#a1a1aa]">Manage and explore your generated environments.</p>
          </div>
          <Link
            href="/world/new"
            className="w-full md:w-auto bg-white text-black text-[12px] leading-[1.0] tracking-[0.05em] font-medium px-6 h-10 rounded flex items-center justify-center gap-2 hover:bg-[#e5e1e4] transition-all active:scale-95"
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
