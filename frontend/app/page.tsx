import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroCanvas } from '@/components/landing/HeroCanvas';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e10] text-[#e5e1e4] overflow-x-hidden">
      <Navbar />

      <main className="flex-grow pt-32 px-[16px] max-w-[1440px] mx-auto w-full">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 space-y-8 py-8">
            <h1 className="text-[48px] leading-[1.1] tracking-[-0.02em] font-semibold text-white max-w-md">
              Turn any image into a walkable world
            </h1>
            <p className="text-[14px] leading-[1.6] text-[#a1a1aa] max-w-sm">
              Upload a photo, press forward, and watch NVIDIA Cosmos generate a physically consistent 3D video environment.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-4">
              <Link
                href="/sign-up"
                className="bg-white text-black px-8 py-3 rounded text-[18px] leading-[1.4] font-bold active:opacity-80 transition-all"
              >
                Get Started
              </Link>
              <Link
                href="/sign-in"
                className="flex items-center gap-2 text-white text-[18px] leading-[1.4] hover:underline decoration-zinc-700 underline-offset-4"
              >
                Sign In
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            <div className="pt-12 flex flex-wrap gap-3">
              {['NVIDIA COSMOS 3', 'REAL-TIME RENDERING', 'ZERO-LATENCY GEN'].map((chip) => (
                <div key={chip} className="border border-[#27272a] px-3 py-1 bg-[#1c1b1d] rounded text-zinc-500 text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase">
                  {chip}
                </div>
              ))}
            </div>
          </div>

          <HeroCanvas />
        </section>

        <section className="mt-32 mb-24 grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 overflow-hidden">
          {[
            { icon: 'deployed_code', title: 'Physically Consistent', desc: 'Neural simulation ensures gravity, lighting, and textures behave exactly as in the real world.' },
            { icon: 'database', title: 'Spatial Memory', desc: 'Worlds are persistent. Everything stays exactly where you left it, rendered in infinite detail.' },
            { icon: 'precision_manufacturing', title: 'Technical Precision', desc: 'Designed for industrial simulation and architectural visualization where accuracy is the only metric.' },
          ].map(({ icon, title, desc }) => (
            <div key={icon} className="bg-zinc-950 p-10 space-y-4 border-zinc-800 hover:border-[#52525b] transition-colors">
              <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
              <h3 className="text-[18px] leading-[1.4] font-medium text-white">{title}</h3>
              <p className="text-[14px] leading-[1.6] text-zinc-500">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
