// TODO: Replace placeholder UI with Stitch Dashboard component after generation.
// Stitch component expected props: worlds, loading, onCreateNew
// See docs/stitch-prompts.md for interface details.

import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  // FUTURE: Fetch worlds from Supabase via Worker API
  // const worlds = await fetch(`${WORKER_URL}/worlds`, { headers... })

  return (
    <div className="mx-auto max-w-5xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Worlds</h1>
        <Link
          href="/world/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New World
        </Link>
      </div>

      {/* TODO: Replace with <StitchDashboard worlds={worlds} loading={loading} /> */}
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">
          Worlds will appear here once you create one.
        </p>
      </div>
    </div>
  );
}
