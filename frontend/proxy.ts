import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/world/:path*',
    // Required for Clerk's frontend API proxy
    '/__clerk/(.*)',
  ],
}
