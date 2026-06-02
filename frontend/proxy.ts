import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Landing page (Navbar uses Clerk <Show>)
    '/',
    // Protected routes
    '/dashboard/:path*',
    '/world/:path*',
    // Auth pages
    '/sign-in',
    '/sign-up',
    // Required for Clerk's frontend API proxy
    '/__clerk/(.*)',
  ],
}
