import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6">
        <Link href="/" className="text-[18px] leading-[1.4] font-bold tracking-tight text-white">
          VectorHorizon
        </Link>
        <main className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden max-w-md space-y-5 lg:block">
            <p className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-[#71717a]">
              Secure world access
            </p>
            <h1 className="text-[40px] leading-[1.1] tracking-tight font-semibold text-white">
              Pick up exactly where your generated worlds left off.
            </h1>
            <p className="text-[14px] leading-[1.6] text-[#a1a1aa]">
              Sign in to manage saved environments, upload new references, and continue exploring your canvases.
            </p>
          </section>
          <section className="flex justify-center lg:justify-end">
            <SignIn />
          </section>
        </main>
      </div>
    </div>
  );
}
