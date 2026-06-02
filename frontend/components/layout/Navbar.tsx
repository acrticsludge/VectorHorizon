import Link from 'next/link';
import { UserButton, Show } from '@clerk/nextjs';

export function Navbar() {
  return (
    <header className="flex justify-between items-center h-16 px-[16px] w-full fixed top-0 z-50 bg-[#131315] border-b border-[#27272a]">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-[18px] leading-[1.4] font-bold tracking-tight text-white">
          VectorHorizon
        </Link>
        <nav className="hidden md:flex gap-6 items-center h-full pt-4">
          <Link href="/dashboard" className="text-white border-b border-white pb-4 text-[14px] leading-[1.6] transition-colors duration-200">
            My Worlds
          </Link>
          <Link href="/dashboard" className="text-[#a1a1aa] hover:text-white transition-colors duration-200 text-[14px] leading-[1.6]">
            World Canvas
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <Show
          when="signed-in"
          fallback={
            <>
              <Link href="/sign-in" className="text-[14px] leading-[1.6] text-[#a1a1aa] hover:text-white transition-colors duration-200">
                Sign In
              </Link>
              <Link href="/sign-up" className="bg-white text-black px-4 py-2 rounded text-[12px] leading-[1.0] tracking-[0.05em] font-medium hover:opacity-90 transition-opacity">
                Get Started
              </Link>
            </>
          }
        >
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
