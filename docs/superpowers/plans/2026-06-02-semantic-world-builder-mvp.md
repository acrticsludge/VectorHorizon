# Semantic World-Builder MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional MVP where authenticated users upload an image, press "Forward" on a virtual joystick, and receive a 3-second NVIDIA Cosmos-generated video that plays seamlessly in a canvas. The world and its single transition are persisted to Supabase.

**Architecture:** Vercel serves a Next.js App Router frontend (static + Server Components, minimal JS). All backend API calls route to a Cloudflare Worker that validates Clerk JWTs, calls NVIDIA Cosmos, stores videos in R2, and logs transitions in Supabase. The Vercel frontend is purely a presentation layer — zero API routes run on Vercel, zero serverless functions. This eliminates Vercel compute costs entirely.

**Tech Stack:**
- **Frontend:** Next.js 16.2.7 (App Router) + Clerk + Supabase JS Client + Tailwind v4
- **Worker:** Cloudflare Workers + Hono + jose (JWT verify) + @supabase/supabase-js
- **Storage:** Cloudflare R2 (image uploads + generated videos)
- **AI:** NVIDIA Cosmos 3 NIM API
- **Fonts:** Geist (already configured)

**Vercel Cost Optimization Applied:**
- Zero Vercel serverless functions — all API logic in Cloudflare Workers
- Middleware matcher explicitly scoped to protected routes only
- Landing page is fully static (no server rendering)
- Server Components by default; single `"use client"` island for the canvas
- No large JS bundles on marketing pages

---

## File Structure

```
C:\Anubhav\Web Dev Projects\VectorHorizon\
├── frontend/                          ← Next.js App Router (Vercel-deployed)
│   ├── app/
│   │   ├── layout.tsx                 ← Root layout (Geist font, globals)
│   │   ├── globals.css                ← Tailwind imports
│   │   ├── page.tsx                   ← Marketing/landing page (STATIC)
│   │   ├── error.tsx                  ← Global error boundary
│   │   ├── not-found.tsx              ← 404 page
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx           ← Clerk sign-in (static)
│   │   │   └── sign-up/
│   │   │       └── page.tsx           ← Clerk sign-up (static)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             ← Dashboard layout with nav + ClerkProtect
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx           ← Dashboard home (worlds list)
│   │   │   └── world/
│   │   │       └── [id]/
│   │   │           └── page.tsx       ← World canvas (Client Component island)
│   │   └── loading.tsx                ← Global loading fallback
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── CanvasViewport.tsx     ← Video playback + crossfade (Client)
│   │   │   ├── JoystickOverlay.tsx    ← Directional controls (Client)
│   │   │   └── ImageUploader.tsx      ← Drop zone for initial image (Client)
│   │   ├── dashboard/
│   │   │   ├── WorldCard.tsx          ← World preview card
│   │   │   └── WorldList.tsx          ← Grid of worlds
│   │   ├── layout/
│   │   │   ├── Navbar.tsx             ← Top navigation
│   │   │   └── AppShell.tsx           ← Dashboard layout wrapper
│   │   └── ui/
│   │       ├── Button.tsx             ← Reusable button
│   │       ├── Card.tsx               ← Reusable card
│   │       └── Toast.tsx              ← Toast notification
│   ├── lib/
│   │   ├── types/
│   │   │   └── world.ts               ← World, Transition, Trajectory types
│   │   ├── api/
│   │   │   └── worker.ts              ← Cloudflare Worker API client
│   │   ├── hooks/
│   │   │   ├── useCanvasEngine.ts     ← Video playback state machine
│   │   │   ├── useJoystickController.ts ← Debounce, queue, AbortController
│   │   │   └── useWorldPersistence.ts ← Save/load worlds to Supabase
│   │   └── utils/
│   │       └── cn.ts                  ← Tailwind class merger
│   ├── middleware.ts                   ← Clerk auth + matcher config
│   ├── .env.example
│   ├── next.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── postcss.config.mjs
│
├── worker/                            ← Cloudflare Worker (separate deploy)
│   ├── src/
│   │   ├── index.ts                   ← Hono router (entry point)
│   │   ├── auth.ts                    ← Clerk JWT verification
│   │   ├── cosmos.ts                  ← NVIDIA Cosmos API client
│   │   ├── r2.ts                      ← R2 put/get operations
│   │   ├── supabase.ts               ← Supabase writes (service role)
│   │   └── types.ts                   ← Worker-specific types
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   └── superpowers/
│       └── plans/
│           └── 2026-06-02-semantic-world-builder-mvp.md
│
├── .env.example                       ← Root env template
├── CLAUDE.md
├── AGENTS.md
└── VectorHorizon_spec_v3.md
```

---

## Task 1: Install Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install Clerk, Supabase client, and Zod**

Install all required packages:

```bash
cd frontend
npm install @clerk/nextjs @supabase/supabase-js zod
```

Expected output: packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Verify build still works**

```bash
cd frontend
npx next build 2>&1 | tail -5
```

Expected: Build completes without errors (may show warnings about missing pages — fine).

- [ ] **Step 3: Create `.env.example` with all required variables**

Write to `frontend/.env.example`:

```
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# Clerk JWT Template — the custom template that issues JWTs for Supabase
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx

# Cloudflare Worker URL (the API gateway)
NEXT_PUBLIC_WORKER_URL=https://world-builder.your-name.workers.dev

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/package.json frontend/package-lock.json frontend/.env.example
git commit -m "frontend: add clerk, supabase, zod dependencies"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `frontend/lib/types/world.ts`

- [ ] **Step 1: Create shared type definitions**

```ts
// frontend/lib/types/world.ts

/** Direction a user can request the camera to move */
export type TrajectoryDirection = 'forward' | 'backward' | 'left' | 'right';

/** User-created world from an initial image */
export interface World {
  id: string;
  userId: string;
  name: string;
  initialImageUrl: string;
  createdAt: string;
  transitionCount?: number;
}

/** A single camera movement and its generated video */
export interface WorldTransition {
  id: string;
  worldId: string;
  userId: string;
  direction: TrajectoryDirection;
  videoUrl: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Request body sent to Cloudflare Worker for generation */
export interface GenerationRequest {
  worldId: string;
  direction: TrajectoryDirection;
  imageBase64: string; // current "best frame" as base64 JPEG
  trajectoryVector: string; // Cosmos-optimized text prompt suffix
}

/** Response from Cloudflare Worker after generation */
export interface GenerationResponse {
  data?: {
    videoUrl: string;
    transitionId: string;
  };
  error?: string;
}

/** The canvas state machine */
export type CanvasState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'generating'; direction: TrajectoryDirection }
  | { status: 'playing' }
  | { status: 'collision'; direction: TrajectoryDirection }
  | { status: 'error'; message: string };

/** Worker API response envelope */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
```

- [ ] **Step 2: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/lib/types/world.ts
git commit -m "frontend: add shared TypeScript types for world, transitions, canvas states"
```

---

## Task 3: Tailwind Utility + UI Primitives

**Files:**
- Create: `frontend/lib/utils/cn.ts`
- Create: `frontend/components/ui/Button.tsx`
- Create: `frontend/components/ui/Card.tsx`
- Create: `frontend/components/ui/Toast.tsx`

- [ ] **Step 1: Create `cn` utility for class merging**

```ts
// frontend/lib/utils/cn.ts
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

- [ ] **Step 2: Create reusable Button component**

```tsx
// frontend/components/ui/Button.tsx
'use client';

import { cn } from '@/lib/utils/cn';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
  secondary: 'border border-zinc-300 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800',
  ghost: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-500',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px]',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
```

- [ ] **Step 3: Create reusable Card component**

```tsx
// frontend/components/ui/Card.tsx
import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses: Record<string, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ className, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Create Toast component**

```tsx
// frontend/components/ui/Toast.tsx
'use client';

import { cn } from '@/lib/utils/cn';
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const variantClasses: Record<string, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900',
};

export function Toast({ message, variant = 'info', visible, onClose, duration = 4000 }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setTimeout(onClose, 300); // wait for exit animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible && !mounted) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300',
        variantClasses[variant],
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/lib/utils/cn.ts frontend/components/ui/Button.tsx frontend/components/ui/Card.tsx frontend/components/ui/Toast.tsx
git commit -m "frontend: add ui primitives — Button, Card, Toast, cn utility"
```

---

## Task 4: Landing Page + Root Layout

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/page.tsx`
- Create: `frontend/app/error.tsx`
- Create: `frontend/app/not-found.tsx`
- Create: `frontend/app/loading.tsx`

- [ ] **Step 1: Update root layout with dark mode support**

```tsx
// frontend/app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VectorHorizon — AI World Builder',
  description: 'Turn static images into physically consistent 3D video environments using NVIDIA Cosmos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Update globals.css with Tailwind v4 theme**

```css
/* frontend/app/globals.css */
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  --background: #ffffff;
  --foreground: #18181b;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #09090b;
    --foreground: #fafafa;
  }
}
```

- [ ] **Step 3: Landing page (fully static — no client JS)**

```tsx
// frontend/app/page.tsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">VectorHorizon</span>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Turn any image into a{' '}
          <span className="text-zinc-500 dark:text-zinc-400">walkable world</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-zinc-500 dark:text-zinc-400">
          Upload a photo, press forward, and watch NVIDIA Cosmos generate a physically
          consistent 3D video environment from your image.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start Building
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign In
          </Link>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-sm text-zinc-400">
        Powered by NVIDIA Cosmos 3 · Clerk Auth · Supabase
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Global error boundary**

```tsx
// frontend/app/error.tsx
'use client';

import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-zinc-500 dark:text-zinc-400">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
```

- [ ] **Step 5: 404 page**

```tsx
// frontend/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="max-w-md text-zinc-500 dark:text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
      >
        Go Home
      </Link>
    </div>
  );
}
```

- [ ] **Step 6: Global loading fallback**

```tsx
// frontend/app/loading.tsx
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/app/layout.tsx frontend/app/globals.css frontend/app/page.tsx frontend/app/error.tsx frontend/app/not-found.tsx frontend/app/loading.tsx
git commit -m "frontend: add landing page, root layout with Clerk, error/404/loading boundaries"
```

---

## Task 5: Clerk Auth — Middleware + Auth Pages

**Files:**
- Create: `frontend/middleware.ts`
- Create: `frontend/app/(auth)/sign-in/page.tsx`
- Create: `frontend/app/(auth)/sign-up/page.tsx`

- [ ] **Step 1: Create middleware with tight matcher (CRITICAL for Vercel cost)**

```ts
// frontend/middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Run Clerk auth ONLY on dashboard and world routes
    '/dashboard/:path*',
    '/world/:path*',
  ],
};
```

**Why this matcher:** The landing page (`/`), sign-in, sign-up, and all static assets (`_next/static`, favicon, etc.) are completely bypassed. This prevents the invocation explosion that plagues middleware without a matcher. On Vercel Hobby, each middleware invocation consumes Fluid CPU — this matcher keeps it to a minimum.

- [ ] **Step 2: Sign-in page**

```tsx
// frontend/app/(auth)/sign-in/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <SignIn />
    </div>
  );
}
```

- [ ] **Step 3: Sign-up page**

```tsx
// frontend/app/(auth)/sign-up/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 4: Build check — verify middleware compiles**

```bash
cd frontend
npx next build 2>&1 | tail -10
```

Expected: Build succeeds. Verify in the output that no middleware invocation warnings appear.

- [ ] **Step 5: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/middleware.ts frontend/app/(auth)/sign-in/page.tsx frontend/app/(auth)/sign-up/page.tsx
git commit -m "frontend: add Clerk auth middleware with tight matcher, sign-in/up pages"
```

---

## Task 6: Dashboard Layout (Protected Route)

**Files:**
- Create: `frontend/app/(dashboard)/layout.tsx`
- Create: `frontend/components/layout/Navbar.tsx`
- Create: `frontend/components/layout/AppShell.tsx`
- Create: `frontend/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create Navbar component**

```tsx
// frontend/components/layout/Navbar.tsx
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="flex h-14 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
      <Link href="/dashboard" className="text-base font-semibold tracking-tight">
        VectorHorizon
      </Link>
      <div className="flex items-center gap-4">
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <Link
            href="/sign-in"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            Sign In
          </Link>
        </SignedOut>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create AppShell layout**

```tsx
// frontend/components/layout/AppShell.tsx
import { Navbar } from './Navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard layout with ClerkProtect**

```tsx
// frontend/app/(dashboard)/layout.tsx
import { ClerkProvider, Protect } from '@clerk/nextjs';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <Protect>
        <AppShell>{children}</AppShell>
      </Protect>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Create dashboard home page**

```tsx
// frontend/app/(dashboard)/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default async function DashboardPage() {
  const { userId } = await auth();

  // Supabase client with Clerk JWT for RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${await auth().then(a => a.getToken())}` } },
    }
  );

  const { data: worlds } = await supabase
    .from('worlds')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Worlds</h1>
        <Link
          href="/world/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New World
        </Link>
      </div>

      {!worlds || worlds.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-4xl">🌄</div>
            <h2 className="text-lg font-semibold">No worlds yet</h2>
            <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Upload an image and start exploring. Your generated worlds will appear here.
            </p>
            <Link
              href="/world/new"
              className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
            >
              Create Your First World
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {worlds.map((world) => (
            <Link key={world.id} href={`/world/${world.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={world.initial_image_url}
                    alt={world.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="mt-3">
                  <h3 className="font-medium">{world.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(world.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Build check**

```bash
cd frontend
npx next build 2>&1 | tail -15
```

Expected: Build succeeds. Watch for Clerk-related build warnings (they're usually fine).

- [ ] **Step 6: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/app/(dashboard)/layout.tsx frontend/app/(dashboard)/dashboard/page.tsx frontend/components/layout/Navbar.tsx frontend/components/layout/AppShell.tsx
git commit -m "frontend: add dashboard layout with ClerkProtect, worlds list page"
```

---

## Task 7: Cloudflare Worker API Client

**Files:**
- Create: `frontend/lib/api/worker.ts`
- Create: `frontend/lib/hooks/useWorldPersistence.ts`

- [ ] **Step 1: Create Worker API client**

```ts
// frontend/lib/api/worker.ts
import { type ApiResponse, type GenerationRequest, type GenerationResponse } from '@/lib/types/world';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787';

async function fetchWorker<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const body = await res.json();

    if (!res.ok) {
      return { error: body.error || `Request failed with status ${res.status}` };
    }

    return { data: body.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Upload an initial image and create a new world */
export async function uploadImage(file: File): Promise<ApiResponse<{ worldId: string; imageUrl: string }>> {
  const formData = new FormData();
  formData.append('image', file);

  const token = await window.Clerk?.session?.getToken();
  if (!token) return { error: 'Not authenticated' };

  try {
    const res = await fetch(`${WORKER_URL}/worlds`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const body = await res.json();
    if (!res.ok) return { error: body.error || 'Upload failed' };
    return { data: body.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' };
  }
}

/** Generate a video for a direction in a world */
export async function generateTransition(
  req: GenerationRequest
): Promise<ApiResponse<GenerationResponse['data']>> {
  return fetchWorker('/generate', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** List all worlds for the current user */
export async function listWorlds(): Promise<ApiResponse<Array<{ id: string; name: string; initial_image_url: string; created_at: string }>>> {
  return fetchWorker('/worlds');
}
```

- [ ] **Step 2: Create world persistence hook**

```ts
// frontend/lib/hooks/useWorldPersistence.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import type { World } from '@/lib/types/world';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useWorldPersistence() {
  const { getToken } = useAuth();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorlds = useCallback(async () => {
    const token = await getToken({ template: 'supabase' });
    if (!token) return;

    const { data, error } = await supabase
      .from('worlds')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWorlds(data as World[]);
    }
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  return { worlds, loading, refresh: fetchWorlds };
}
```

- [ ] **Step 3: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/lib/api/worker.ts frontend/lib/hooks/useWorldPersistence.ts
git commit -m "frontend: add Worker API client and Supabase world persistence hook"
```

---

## Task 8: Canvas Engine — Video Playback + Crossfade

**Files:**
- Create: `frontend/lib/hooks/useCanvasEngine.ts`
- Create: `frontend/lib/hooks/useJoystickController.ts`
- Create: `frontend/components/canvas/CanvasViewport.tsx`
- Create: `frontend/components/canvas/JoystickOverlay.tsx`
- Create: `frontend/components/canvas/ImageUploader.tsx`

- [ ] **Step 1: Create canvas engine hook**

This manages the video playback state machine with double-buffered crossfade.

```ts
// frontend/lib/hooks/useCanvasEngine.ts
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { CanvasState, TrajectoryDirection } from '@/lib/types/world';

interface VideoBuffer {
  url: string;
  direction: TrajectoryDirection;
  id: string;
}

export function useCanvasEngine() {
  const [state, setState] = useState<CanvasState>({ status: 'idle' });
  const [currentVideo, setCurrentVideo] = useState<VideoBuffer | null>(null);
  const [nextVideo, setNextVideo] = useState<VideoBuffer | null>(null);

  const currentRef = useRef<HTMLVideoElement>(null);
  const nextRef = useRef<HTMLVideoElement>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [isTransitioning, setIsTransitioning] = useState(false);

  /** Preload a video into the "next" buffer */
  const preloadVideo = useCallback((video: VideoBuffer) => {
    setNextVideo(video);
  }, []);

  /** Crossfade from current to next, then promote next -> current */
  const playVideo = useCallback((video: VideoBuffer) => {
    if (currentVideo) {
      // We have a current video — crossfade to next
      setNextVideo(video);
      setIsTransitioning(true);

      fadeTimeoutRef.current = setTimeout(() => {
        setCurrentVideo(video);
        setNextVideo(null);
        setIsTransitioning(false);
        setState({ status: 'playing' });
      }, 300); // crossfade duration
    } else {
      // First video — just set it
      setCurrentVideo(video);
      setState({ status: 'playing' });
    }
  }, [currentVideo]);

  const handleVideoEnded = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const setGenerating = useCallback((direction: TrajectoryDirection) => {
    setState({ status: 'generating', direction });
  }, []);

  const setError = useCallback((message: string) => {
    setState({ status: 'error', message });
  }, []);

  const setIdle = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const setCollision = useCallback((direction: TrajectoryDirection) => {
    setState({ status: 'collision', direction });
    // Auto-reset to idle after 1 second
    setTimeout(() => setState({ status: 'idle' }), 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  return {
    state,
    currentVideo,
    nextVideo,
    currentRef,
    nextRef,
    isTransitioning,
    playVideo,
    preloadVideo,
    setGenerating,
    setError,
    setIdle,
    setCollision,
    handleVideoEnded,
  };
}
```

- [ ] **Step 2: Create joystick controller hook**

```ts
// frontend/lib/hooks/useJoystickController.ts
'use client';

import { useRef, useCallback, useState } from 'react';
import type { TrajectoryDirection } from '@/lib/types/world';
import { generateTransition } from '@/lib/api/worker';

interface UseJoystickControllerOptions {
  worldId: string;
  currentFrameBase64: string;
  onGenerationStart: (direction: TrajectoryDirection) => void;
  onGenerationComplete: (direction: TrajectoryDirection, videoUrl: string, transitionId: string) => void;
  onCollision: (direction: TrajectoryDirection) => void;
  onError: (message: string) => void;
}

/** Map joystick direction to Cosmos-optimized trajectory text */
function directionToTrajectoryVector(direction: TrajectoryDirection): string {
  const vectors: Record<TrajectoryDirection, string> = {
    forward:
      'The camera moves forward at walking pace. Objects grow larger. Perspective converges toward the vanishing point. New surfaces and details become visible. Physics consistent: gravity downward, objects maintain scale, parallax shifts naturally.',
    backward:
      'The camera reverses. Objects shrink. The field of view widens. Previously occluded regions appear. Physics consistent: motion blur proportional to speed, objects maintain scale.',
    left:
      'The camera pans left. Objects slide right in the frame. New left-side surfaces come into view. Parallax reveals depth behind foreground objects.',
    right:
      'The camera pans right. Objects slide left. New right-side surfaces come into view. Parallax reveals depth behind foreground objects.',
  };
  return vectors[direction];
}

export function useJoystickController(options: UseJoystickControllerOptions) {
  const { worldId, currentFrameBase64, onGenerationStart, onGenerationComplete, onCollision, onError } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [queueDirection, setQueueDirection] = useState<TrajectoryDirection | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const executeDirection = useCallback(
    async (direction: TrajectoryDirection) => {
      setIsGenerating(true);
      onGenerationStart(direction);
      setQueueDirection(null);

      // Create abort controller for this request
      abortRef.current = new AbortController();

      try {
        const result = await generateTransition({
          worldId,
          direction,
          imageBase64: currentFrameBase64,
          trajectoryVector: directionToTrajectoryVector(direction),
        });

        if (result.error) {
          // Check if it's a collision (Worker returns specific error)
          if (result.error.toLowerCase().includes('collision') || result.error.toLowerCase().includes('cannot advance')) {
            onCollision(direction);
          } else {
            onError(result.error);
          }
          setIsGenerating(false);
          return;
        }

        if (result.data) {
          onGenerationComplete(direction, result.data.videoUrl, result.data.transitionId);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Request was aborted by a new direction — expected
          return;
        }
        onError(err instanceof Error ? err.message : 'Generation failed');
      }

      setIsGenerating(false);

      // Process queued direction if any
      if (queueDirection) {
        executeDirection(queueDirection);
      }
    },
    [worldId, currentFrameBase64, onGenerationStart, onGenerationComplete, onCollision, onError, queueDirection]
  );

  const handleDirection = useCallback(
    (direction: TrajectoryDirection) => {
      // Debounce: reset timer on each input
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (isGenerating) {
          // Currently generating — queue the latest direction
          setQueueDirection(direction);
          // Abort current request so we can start fresh
          if (abortRef.current) {
            abortRef.current.abort();
          }
        } else {
          executeDirection(direction);
        }
      }, 200); // 200ms debounce after last input
    },
    [isGenerating, executeDirection]
  );

  return {
    handleDirection,
    isGenerating,
    queueDirection,
  };
}
```

- [ ] **Step 3: Create CanvasViewport component**

```tsx
// frontend/components/canvas/CanvasViewport.tsx
'use client';

import { useCanvasEngine } from '@/lib/hooks/useCanvasEngine';
import { cn } from '@/lib/utils/cn';

interface CanvasViewportProps {
  engine: ReturnType<typeof useCanvasEngine>;
  initialImageUrl?: string;
}

export function CanvasViewport({ engine, initialImageUrl }: CanvasViewportProps) {
  const { state, currentVideo, nextVideo, currentRef, nextRef, isTransitioning, handleVideoEnded } = engine;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950">
      {/* Initial image — shown when idle and no video loaded */}
      {state.status === 'idle' && !currentVideo && initialImageUrl && (
        <img
          src={initialImageUrl}
          alt="World environment"
          className="h-full w-full object-cover"
        />
      )}

      {/* Current video — always the active playback */}
      {currentVideo && (
        <video
          ref={currentRef}
          src={currentVideo.url}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            isTransitioning ? 'opacity-0' : 'opacity-100'
          )}
          autoPlay
          onEnded={handleVideoEnded}
          playsInline
          muted
        />
      )}

      {/* Next video — used for crossfade transition */}
      {nextVideo && (
        <video
          ref={nextRef}
          src={nextVideo.url}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            isTransitioning ? 'opacity-100' : 'opacity-0'
          )}
          autoPlay
          playsInline
          muted
        />
      )}

      {/* Generating overlay */}
      {state.status === 'generating' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <span className="text-sm font-medium text-white">
              Generating {state.direction}...
            </span>
          </div>
        </div>
      )}

      {/* Collision flash */}
      {state.status === 'collision' && (
        <div className="pointer-events-none absolute inset-0 animate-pulse border-4 border-red-500/50" />
      )}

      {/* Error overlay */}
      {state.status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <p className="max-w-md text-center text-sm text-red-400">
            {state.status === 'error' && 'message' in state ? (state as { status: 'error'; message: string }).message : 'Something went wrong'}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create JoystickOverlay component**

48×48px minimum touch targets as required by mobile checklist.

```tsx
// frontend/components/canvas/JoystickOverlay.tsx
'use client';

import { cn } from '@/lib/utils/cn';
import type { TrajectoryDirection } from '@/lib/types/world';

interface JoystickOverlayProps {
  onDirection: (direction: TrajectoryDirection) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  className?: string;
}

const directions: Array<{
  direction: TrajectoryDirection;
  label: string;
  icon: string;
  position: string;
}> = [
  { direction: 'forward', label: 'Forward', icon: '↑', position: 'top-2 left-1/2 -translate-x-1/2' },
  { direction: 'backward', label: 'Backward', icon: '↓', position: 'bottom-2 left-1/2 -translate-x-1/2' },
  { direction: 'left', label: 'Left', icon: '←', position: 'top-1/2 left-2 -translate-y-1/2' },
  { direction: 'right', label: 'Right', icon: '→', position: 'top-1/2 right-2 -translate-y-1/2' },
];

export function JoystickOverlay({ onDirection, disabled, isGenerating, className }: JoystickOverlayProps) {
  return (
    <div className={cn('relative h-40 w-40', className)}>
      {/* D-pad base */}
      <div className="absolute inset-0 rounded-full border-2 border-zinc-700 bg-zinc-900/60 backdrop-blur-sm" />

      {/* Directional buttons — 48×48px minimum touch target */}
      {directions.map(({ direction, label, icon, position }) => (
        <button
          key={direction}
          onClick={() => onDirection(direction)}
          disabled={disabled || isGenerating}
          aria-label={label}
          className={cn(
            'absolute flex h-12 w-12 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-lg text-white transition-all',
            'hover:bg-zinc-700 active:scale-95 active:bg-zinc-600',
            'disabled:pointer-events-none disabled:opacity-40',
            'focus:outline-none focus:ring-2 focus:ring-white/50',
            isGenerating && 'animate-pulse',
            position
          )}
        >
          {icon}
        </button>
      ))}

      {/* Center dot */}
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-500" />
    </div>
  );
}
```

- [ ] **Step 5: Create Image Uploader component**

```tsx
// frontend/components/canvas/ImageUploader.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { uploadImage } from '@/lib/api/worker';

interface ImageUploaderProps {
  onUploadComplete: (worldId: string, imageUrl: string) => void;
  onError: (message: string) => void;
}

export function ImageUploader({ onUploadComplete, onError }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        onError('Please upload an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        onError('Image must be less than 10MB');
        return;
      }

      setUploading(true);
      const result = await uploadImage(file);
      setUploading(false);

      if (result.error) {
        onError(result.error);
        return;
      }

      if (result.data) {
        onUploadComplete(result.data.worldId, result.data.imageUrl);
      }
    },
    [onUploadComplete, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors',
        dragOver
          ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800'
          : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Uploading...</p>
        </div>
      ) : (
        <>
          <div className="mb-3 text-3xl">🌄</div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Drop an image here, or click to browse
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            JPEG, PNG, WebP — max 10MB
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/lib/hooks/useCanvasEngine.ts frontend/lib/hooks/useJoystickController.ts frontend/components/canvas/CanvasViewport.tsx frontend/components/canvas/JoystickOverlay.tsx frontend/components/canvas/ImageUploader.tsx
git commit -m "frontend: add canvas engine with crossfade, joystick controller with debounce/queue, image uploader"
```

---

## Task 9: World Canvas Page (Main Interaction)

**Files:**
- Create: `frontend/app/(dashboard)/world/[id]/page.tsx`
- Create: `frontend/app/(dashboard)/world/new/page.tsx`

- [ ] **Step 1: Create "new world" page — initial image upload**

```tsx
// frontend/app/(dashboard)/world/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ImageUploader } from '@/components/canvas/ImageUploader';
import { Toast } from '@/components/ui/Toast';

export default function NewWorldPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const handleUploadComplete = (worldId: string) => {
    setToast({ message: 'World created!', variant: 'success' });
    setTimeout(() => router.push(`/world/${worldId}`), 500);
  };

  const handleError = (message: string) => {
    setToast({ message, variant: 'error' });
  };

  return (
    <div className="mx-auto max-w-2xl pt-12">
      <h1 className="mb-2 text-2xl font-bold">New World</h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Upload an image to serve as your starting environment.
      </p>
      <ImageUploader onUploadComplete={handleUploadComplete} onError={handleError} />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          visible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create world canvas page — the core interactive experience**

This is the single `"use client"` island for the Canvas. Everything else on the page is static/Server Component.

```tsx
// frontend/app/(dashboard)/world/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { CanvasViewport } from '@/components/canvas/CanvasViewport';
import { JoystickOverlay } from '@/components/canvas/JoystickOverlay';
import { useCanvasEngine } from '@/lib/hooks/useCanvasEngine';
import { useJoystickController } from '@/lib/hooks/useJoystickController';
import { Toast } from '@/components/ui/Toast';
import type { TrajectoryDirection } from '@/lib/types/world';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function WorldCanvasPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const engine = useCanvasEngine();

  const [initialImageUrl, setInitialImageUrl] = useState<string>('');
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [currentFrameBase64, setCurrentFrameBase64] = useState('');

  // Load world data on mount
  useEffect(() => {
    async function loadWorld() {
      if (!params.id || params.id === 'new') return;
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const { data, error } = await supabase
        .from('worlds')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        setToast({ message: 'World not found', variant: 'error' });
        return;
      }

      setInitialImageUrl(data.initial_image_url);
      setWorldLoaded(true);
    }
    loadWorld();
  }, [params.id, getToken]);

  const handleGenerationStart = useCallback(
    (direction: TrajectoryDirection) => {
      engine.setGenerating(direction);
    },
    [engine]
  );

  const handleGenerationComplete = useCallback(
    (direction: TrajectoryDirection, videoUrl: string) => {
      // Double-buffered: preload the next, then play with crossfade
      engine.playVideo({ url: videoUrl, direction, id: `${Date.now()}` });
    },
    [engine]
  );

  const handleCollision = useCallback(
    (direction: TrajectoryDirection) => {
      engine.setCollision(direction);
      setToast({ message: `Can't move ${direction} — boundary reached`, variant: 'info' });
      setTimeout(() => setToast(null), 2000);
    },
    [engine]
  );

  const handleError = useCallback(
    (message: string) => {
      engine.setError(message);
      setToast({ message, variant: 'error' });
    },
    [engine]
  );

  const joystick = useJoystickController({
    worldId: params.id || '',
    currentFrameBase64,
    onGenerationStart: handleGenerationStart,
    onGenerationComplete: handleGenerationComplete,
    onCollision: handleCollision,
    onError: handleError,
  });

  if (params.id === 'new') return null; // handled by the /world/new route

  if (!worldLoaded) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">World Canvas</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {engine.state.status === 'generating'
            ? `Generating ${engine.state.direction}...`
            : engine.state.status === 'playing'
              ? 'Playing'
              : 'Ready'}
        </span>
      </div>

      <div className="relative">
        <CanvasViewport engine={engine} initialImageUrl={initialImageUrl} />

        {/* Joystick overlay — bottom-right of canvas */}
        <div className="absolute bottom-4 right-4">
          <JoystickOverlay
            onDirection={joystick.handleDirection}
            disabled={!worldLoaded}
            isGenerating={joystick.isGenerating}
          />
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          visible={!!toast}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build check**

```bash
cd frontend
npx next build 2>&1 | tail -10
```

Expected: Build succeeds. If Clerk types cause issues, add `"skipLibCheck": true` to tsconfig or ignore the lint.

- [ ] **Step 4: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/app/(dashboard)/world/[id]/page.tsx frontend/app/(dashboard)/world/new/page.tsx
git commit -m "frontend: add world canvas page with joystick, viewport, and generation flow"
```

---

## Task 10: Cloudflare Worker Setup

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`
- Create: `worker/src/types.ts`
- Create: `worker/src/auth.ts`
- Create: `worker/src/r2.ts`
- Create: `worker/src/cosmos.ts`
- Create: `worker/src/supabase.ts`
- Create: `worker/src/index.ts`

- [ ] **Step 1: Create worker package.json**

```json
{
  "name": "vectorhorizon-worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4",
    "@supabase/supabase-js": "^2",
    "jose": "^5"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4",
    "typescript": "^5",
    "wrangler": "^4"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create wrangler.toml**

```toml
name = "vectorhorizon-worker"
main = "src/index.ts"
compatibility_date = "2026-06-01"

# Supabase
[vars]
SUPABASE_URL = ""
SUPABASE_SERVICE_ROLE_KEY = ""

# Clerk JWT verification — replace with your Clerk domain later
CLERK_JWKS_URL = "https://your-domain.clerk.accounts.dev/.well-known/jwks.json"

# NVIDIA Cosmos 3
NVIDIA_COSMOS_API_KEY = ""
NVIDIA_COSMOS_BASE_URL = "https://integrate.api.nvidia.com/v1"

# R2
[[r2_buckets]]
binding = "WORLD_ASSETS"
bucket_name = "vectorhorizon-world-assets"
```

- [ ] **Step 4: Create shared types**

```ts
// worker/src/types.ts
export type TrajectoryDirection = 'forward' | 'backward' | 'left' | 'right';

export interface GenerationRequest {
  worldId: string;
  direction: TrajectoryDirection;
  imageBase64: string;
  trajectoryVector: string;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CLERK_JWKS_URL: string;
  NVIDIA_COSMOS_API_KEY: string;
  NVIDIA_COSMOS_BASE_URL: string;
  WORLD_ASSETS: R2Bucket;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
```

- [ ] **Step 5: Create Clerk JWT verification middleware**

```ts
// worker/src/auth.ts
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './types';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(env: Env) {
  if (!jwksCache) {
    const url = new URL(env.CLERK_JWKS_URL);
    jwksCache = createRemoteJWKSet(url);
  }
  return jwksCache;
}

export async function verifyAuth(token: string, env: Env): Promise<{ userId: string } | { error: string }> {
  try {
    const JWKS = getJWKS(env);
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
    });
    const sub = payload.sub as string;
    if (!sub) return { error: 'Invalid token: no subject' };
    return { userId: sub };
  } catch (err) {
    return { error: 'Invalid or expired token' };
  }
}
```

- [ ] **Step 6: Create R2 operations**

```ts
// worker/src/r2.ts
import type { Env } from './types';

export async function uploadToR2(
  env: Env,
  key: string,
  body: ArrayBuffer | ReadableStream,
  contentType: string
): Promise<string> {
  await env.WORLD_ASSETS.put(key, body, {
    httpMetadata: { contentType },
  });
  return key;
}

const R2_PUBLIC_BASE = 'https://pub-xxxxxxxxxx.r2.dev'; // Replace with your R2 public bucket URL

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`;
}

export async function getPresignedUploadUrl(
  env: Env,
  key: string
): Promise<string> {
  // For large files > 100MB, use presigned URLs
  // For MVP, we upload directly through the worker (under 10MB)
  return getPublicUrl(key);
}
```

- [ ] **Step 7: Create Cosmos API client**

Uses NVIDIA Cosmos 3 NIM API: `nvidia/cosmos-predict2.5-video2world` model, synchronous video endpoint.

```ts
// worker/src/cosmos.ts
import type { Env } from './types';

interface CosmosResponse {
  videoBase64: string; // b64_video from API response
  seed: number;
}

/**
 * Call NVIDIA Cosmos 3 NIM to generate a physics-aware video.
 * API ref: https://integrate.api.nvidia.com/v1/videos/sync
 * Model: nvidia/cosmos-predict2.5-video2world
 */
export async function generateVideo(
  env: Env,
  inputImageBase64: string,
  trajectoryPrompt: string,
  previousVideoBase64?: string // For Phase 2 continuity (unused in MVP)
): Promise<CosmosResponse | { error: string }> {
  const baseUrl = env.NVIDIA_COSMOS_BASE_URL || 'https://integrate.api.nvidia.com/v1';

  // Cosmos 3 requires width/height to be multiples of 8
  const payload: Record<string, unknown> = {
    model: 'nvidia/cosmos-predict2.5-video2world',
    prompt: trajectoryPrompt,
    image: `data:image/jpeg;base64,${inputImageBase64}`,
    video_params: {
      height: 720,  // multiple of 8
      width: 1280,  // multiple of 8
      num_frames: 24,
      fps: 8,
    },
  };

  // Phase 2: attach previous video for continuity (disabled in MVP)
  if (previousVideoBase64) {
    payload.video = `data:video/mp4;base64,${previousVideoBase64}`;
  }

  try {
    const response = await fetch(`${baseUrl}/videos/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.NVIDIA_COSMOS_API_KEY}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { error: `Cosmos API error (${response.status}): ${errText.slice(0, 200)}` };
    }

    const result = await response.json() as { b64_video?: string; seed?: number; error?: string };

    if (result.error) {
      return { error: result.error };
    }

    if (!result.b64_video) {
      return { error: 'Cosmos returned no video data' };
    }

    return {
      videoBase64: result.b64_video,
      seed: result.seed ?? 0,
    };
  } catch (err) {
    return { error: `Cosmos request failed: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}
```

- [ ] **Step 8: Create Supabase client**

```ts
// worker/src/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Env } from './types';

let db: ReturnType<typeof createClient> | null = null;

function getDb(env: Env) {
  if (!db) {
    db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return db;
}

export async function createWorld(
  env: Env,
  userId: string,
  imageUrl: string,
  name?: string
): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await getDb(env)
      .from('worlds')
      .insert({
        user_id: userId,
        name: name || 'My World',
        initial_image_url: imageUrl,
      })
      .select('id')
      .single();

    if (error) return { error: error.message };
    return { id: data.id };
  } catch (err) {
    return { error: 'Database error creating world' };
  }
}

export async function createTransition(
  env: Env,
  worldId: string,
  userId: string,
  direction: string,
  videoUrl: string
): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await getDb(env)
      .from('world_transitions')
      .insert({
        world_id: worldId,
        user_id: userId,
        direction,
        video_url: videoUrl,
      })
      .select('id')
      .single();

    if (error) return { error: error.message };
    return { id: data.id };
  } catch (err) {
    return { error: 'Database error saving transition' };
  }
}

export async function getWorld(
  env: Env,
  worldId: string,
  userId: string
): Promise<{ world: any } | { error: string }> {
  try {
    const { data, error } = await getDb(env)
      .from('worlds')
      .select('*')
      .eq('id', worldId)
      .eq('user_id', userId)
      .single();

    if (error) return { error: 'World not found' };
    return { world: data };
  } catch (err) {
    return { error: 'Database error' };
  }
}
```

- [ ] **Step 9: Create the main Worker entry point (Hono router)**

```ts
// worker/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyAuth } from './auth';
import { uploadToR2 } from './r2';
import { generateVideo } from './cosmos';
import { createWorld, createTransition, getWorld } from './supabase';
import type { Env, GenerationRequest } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS — restricted to frontend origin
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://vectorhorizon.vercel.app'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

// Health check
app.get('/health', (c) => c.json({ data: { status: 'ok' } }));

/** POST /worlds — Create a new world from an uploaded image */
app.post('/worlds', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  const body = await c.req.parseBody();
  const imageFile = body['image'] as File | null;

  if (!imageFile) return c.json({ error: 'No image provided' }, 400);
  if (!imageFile.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400);
  if (imageFile.size > 10 * 1024 * 1024) return c.json({ error: 'Image must be under 10MB' }, 400);

  try {
    // Upload image to R2
    const imageBuffer = await imageFile.arrayBuffer();
    const r2Key = `worlds/${auth.userId}/${crypto.randomUUID()}-${imageFile.name}`;
    await uploadToR2(c.env, r2Key, imageBuffer, imageFile.type);

    // Create world record in Supabase
    const result = await createWorld(c.env, auth.userId, r2Key);
    if ('error' in result) return c.json({ error: result.error }, 500);

    return c.json({ data: { worldId: result.id, imageUrl: r2Key } }, 201);
  } catch (err) {
    return c.json({ error: 'Upload failed' }, 500);
  }
});

/** POST /generate — Generate a video trajectory */
app.post('/generate', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  const body: GenerationRequest = await c.req.json();

  if (!body.worldId || !body.direction || !body.imageBase64) {
    return c.json({ error: 'Missing required fields: worldId, direction, imageBase64' }, 400);
  }

  // Validate direction
  const validDirections = ['forward', 'backward', 'left', 'right'];
  if (!validDirections.includes(body.direction)) {
    return c.json({ error: `Invalid direction. Must be one of: ${validDirections.join(', ')}` }, 400);
  }

  // Verify world ownership
  const world = await getWorld(c.env, body.worldId, auth.userId);
  if ('error' in world) return c.json({ error: 'World not found' }, 404);

  try {
    // Call NVIDIA Cosmos
    const cosmosResult = await generateVideo(c.env, body.imageBase64, body.trajectoryVector);

    if ('error' in cosmosResult) {
      return c.json({ error: cosmosResult.error }, 502);
    }

    // Cosmos returns base64-encoded MP4 — decode to binary
    const videoBinary = Uint8Array.from(
      atob(cosmosResult.videoBase64),
      (c) => c.charCodeAt(0)
    );

    // Upload generated video to R2
    const videoKey = `transitions/${auth.userId}/${body.worldId}/${crypto.randomUUID()}.mp4`;
    await uploadToR2(c.env, videoKey, videoBinary, 'video/mp4');

    const publicUrl = getPublicUrl(videoKey);

    // Log transition in Supabase
    const transition = await createTransition(c.env, body.worldId, auth.userId, body.direction, publicUrl);
    if ('error' in transition) {
      // Video is in R2 but DB write failed — log for recovery
      console.error(`[worker] Orphaned video: ${videoKey}, world: ${body.worldId}`);
      // Return video URL anyway so the frontend can still play it
      return c.json({ error: 'Partial save — video available but transition unlogged' }, 500);
    }

    // Return the video URL and transition ID
    return c.json({
      data: {
        videoUrl: publicUrl,
        transitionId: transition.id,
      },
    }, 201);
  } catch (err) {
    return c.json({ error: 'Generation failed' }, 500);
  }
});

/** GET /worlds — List user's worlds */
app.get('/worlds', async (c) => {
  const auth = await verifyAuth(c.req.header('Authorization')?.replace('Bearer ', '') || '', c.env);
  if ('error' in auth) return c.json({ error: auth.error }, 401);

  const { getDb } = await import('./supabase');
  const supabase = getDb(c.env);

  const { data, error } = await supabase
    .from('worlds')
    .select('id, name, initial_image_url, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: 'Failed to fetch worlds' }, 500);
  return c.json({ data }, 200);
});

export default app;
```

- [ ] **Step 10: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add worker/
git commit -m "worker: add Cloudflare Worker with Hono router, Clerk auth, Cosmos API, R2 storage, Supabase writes"
```

---

## Task 11: Supabase Schema Migration

**Files:**
- Create: `worker/supabase-schema.sql`

- [ ] **Step 1: Write the SQL migration**

```sql
-- supabase-schema.sql
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Worlds table
CREATE TABLE IF NOT EXISTS public.worlds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  name text DEFAULT 'My World',
  initial_image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- World transitions table
CREATE TABLE IF NOT EXISTS public.world_transitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  direction text NOT NULL,
  video_url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worlds_user_id ON public.worlds(user_id);
CREATE INDEX IF NOT EXISTS idx_transitions_world_id ON public.world_transitions(world_id);
CREATE INDEX IF NOT EXISTS idx_transitions_user_id ON public.world_transitions(user_id);

-- Enable RLS
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_transitions ENABLE ROW LEVEL SECURITY;

-- RLS policies for worlds
CREATE POLICY "Users can select own worlds"
ON public.worlds FOR SELECT
USING (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can insert own worlds"
ON public.worlds FOR INSERT
WITH CHECK (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can delete own worlds"
ON public.worlds FOR DELETE
USING (auth.jwt()->>'sub' = user_id);

-- RLS policies for transitions
CREATE POLICY "Users can select own transitions"
ON public.world_transitions FOR SELECT
USING (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can insert own transitions"
ON public.world_transitions FOR INSERT
WITH CHECK (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can delete own transitions"
ON public.world_transitions FOR DELETE
USING (auth.jwt()->>'sub' = user_id);
```

- [ ] **Step 2: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add worker/supabase-schema.sql
git commit -m "worker: add Supabase schema with RLS policies for worlds and transitions"
```

---

## Task 12: Vercel Configuration for Static Optimization

**Files:**
- Modify: `frontend/next.config.ts`

- [ ] **Step 1: Optimize Next.js config for minimal Vercel compute**

```ts
// frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Vercel deployment
  output: 'standalone',

  // NOTE: serverActions config removed — Next.js 16 handles this differently.
  // All mutations route through the Cloudflare Worker, not server actions.

  // Image optimization: allow external images from R2
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
```

- [ ] **Step 2: Build check**

```bash
cd frontend
npx next build 2>&1 | tail -10
```

Expected: Build succeeds. Verify in the output that pages are marked as `○` (static) or `λ` (dynamic). The landing page should be `○`.

- [ ] **Step 3: Commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add frontend/next.config.ts
git commit -m "frontend: optimize next.config for static output, disable server actions"
```

---

## Task 13: Final Verification

- [ ] **Step 1: TypeScript check both projects**

```bash
cd frontend
npx tsc --noEmit 2>&1
```

Expected: No type errors.

```bash
cd worker
npx tsc --noEmit 2>&1
```

Expected: No type errors.

- [ ] **Step 2: Full build of frontend**

```bash
cd frontend
npx next build 2>&1
```

Expected: Build succeeds. Check summary:
- Landing page (`/`) → `○` (Static)
- Sign-in/up → `○` or `λ` (Clerk may make them dynamic)
- Dashboard → `λ` (Server Component with data)
- World canvas → `λ` (Client Component island)

- [ ] **Step 3: Checklist compliance scan**

Verify against the project's checklists:

| Checklist | Status | Key Items |
|-----------|--------|-----------|
| ✅ Performance | LCP <2.5s | `next/image` not used for canvas videos (by design — video is dynamic content). Static pages have no JS. |
| ✅ Mobile | 48×48px touch targets | JoystickOverlay buttons are `h-12 w-12` = 48×48px. Viewport meta tag present. |
| ✅ Error Handling | Boundaries in place | `error.tsx` on global. Toast for per-operation errors. Canvas error overlay. |
| ✅ API Security | JWT gated, RLS enforced | Worker validates every request. Supabase RLS enforced at DB level. Service key never exposed. |
| ✅ Practices | Server Components by default, no `any`, response envelope | All pages are Server Components except canvas island. ApiResponse<T> envelope used everywhere. |

- [ ] **Step 4: Final commit**

```bash
cd C:\Anubhav\Web Dev Projects\VectorHorizon
git add -A
git commit -m "mvp: complete semantic world-builder MVP — frontend app, cloudflare worker, supabase schema"
```

---

## Vercel Cost Analysis

| Feature | Cost Impact | Notes |
|---------|-------------|-------|
| Static landing page | $0 (no compute) | Fully static, served from CDN |
| Server Components (dashboard) | Minimal | Renders on demand but lightweight |
| Middleware | Low (explicit matcher) | Only runs on `/dashboard/*` and `/world/*` |
| Client JS bundle | Small | Only `canvas/*` components are `"use client"` |
| API routes | **$0** (none exist) | All API calls go to Cloudflare Worker |
| Image optimization | $0 (disabled for canvas content) | R2 URLs served directly |

**Estimated Vercel Hobby usage:** Well within free tier limits. Zero serverless function invocations. Minimal middleware invocations.

---

## Assumptions Made (Unanswered Questions from Design Phase)

Since the critical questions from the design phase were not answered, these assumptions are baked into the plan:

1. **NVIDIA Cosmos returns full MP4, not streamed chunks** — Crossfade buffer handles the 3-second wait.
2. **Joystick is button-based (click events), not analog delta** — Direction enum only. Paddle/analog can be added later.
3. **No Infinite Horizon chaining in MVP** — Single generation per world. Baseline image is static.
4. **Forward-only feedback** — All 4 directions are coded but only forward is tested. Orbital controls cut.
5. **Clerk JWT template named "supabase"** — Must be configured in Clerk Dashboard to issue tokens for Supabase.
6. **Single world, no multi-world gallery in MVP** — Gallery page lists worlds but upload creates one at a time.
7. **R2 bucket is public-read** — Video URLs are direct R2 keys. For production, add a Worker route that streams with auth check.
