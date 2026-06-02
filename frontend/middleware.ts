import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/world/:path*',
  ],
}
