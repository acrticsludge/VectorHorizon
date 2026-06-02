import Link from 'next/link';
import { SignedIn } from '@clerk/nextjs';

const sidebarLink = (href: string, icon: string, label: string, active?: boolean) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-3 py-2 rounded text-[12px] leading-[1.0] tracking-[0.05em] font-medium transition-all duration-150 ${
      active
        ? 'text-white bg-[#2a2a2c]'
        : 'text-[#a1a1aa] hover:bg-[#2a2a2c] hover:text-white'
    }`}
  >
    <span className="material-symbols-outlined text-base">{icon}</span>
    {label}
  </Link>
);

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col h-screen py-6 px-4 gap-4 fixed left-0 top-16 w-64 bg-[#131315] border-r border-[#27272a] z-40">
      <SignedIn>
        <nav className="flex flex-col gap-1 flex-1">
          {sidebarLink('/dashboard', 'dashboard', 'Dashboard', true)}
        </nav>
        <div className="flex flex-col gap-1 mt-auto">
          <Link
            href="/world/new"
            className="w-full bg-white text-black text-[12px] leading-[1.0] tracking-[0.05em] font-medium py-3 rounded flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create New World
          </Link>
        </div>
      </SignedIn>
    </aside>
  );
}
