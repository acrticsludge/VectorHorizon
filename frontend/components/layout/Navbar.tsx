'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, Show } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();
  const isMyWorlds = pathname === '/dashboard';
  const isNewWorld = pathname === '/world/new';
  const activeLink = 'dashboard-nav-link dashboard-nav-link-active text-white text-[14px] leading-[1.6]';
  const idleLink = 'dashboard-nav-link text-[#a1a1aa] hover:text-white text-[14px] leading-[1.6]';

  return (
    <header className="flex justify-between items-center h-16 px-4 md:px-6 w-full fixed top-0 z-50 bg-[#131315]/95 backdrop-blur border-b border-[#27272a]">
      <div className="flex min-w-0 items-center gap-8">
        <Link href="/" className="shrink-0 text-[18px] leading-[1.4] font-bold tracking-tight text-white">
          VectorHorizon
        </Link>
        <Show when="signed-in">
          <nav className="hidden md:flex gap-6 items-stretch h-full">
            <Link href="/dashboard" className={isMyWorlds ? activeLink : idleLink}>
              My Worlds
            </Link>
            <Link href="/world/new" className={isNewWorld ? activeLink : idleLink}>
              New World
            </Link>
          </nav>
        </Show>
      </div>
      <div className="flex shrink-0 items-center gap-3 md:gap-4">
        <Show
          when="signed-in"
          fallback={
            <>
              <Link href="/sign-in" className="text-[14px] leading-[1.6] text-[#a1a1aa] hover:text-white transition-colors duration-200">
                Sign In
              </Link>
              <Link href="/sign-up" className="bg-white text-black px-4 py-2 rounded text-[12px] leading-[1.0] tracking-[0.05em] font-medium hover:bg-[#e5e1e4] active:scale-[0.98] transition-all">
                Get Started
              </Link>
            </>
          }
        >
          <UserButton userProfileMode="modal" />
        </Show>
      </div>
    </header>
  );
}
