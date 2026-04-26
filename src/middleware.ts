import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Token Refresh Middleware
 *
 * Intercepts API calls that need fresh OAuth tokens and adds a header
 * indicating that token refresh may be needed. The actual refresh logic
 * is handled by server-side utilities (see src/lib/token-refresh.ts).
 *
 * This middleware:
 * - Checks for authenticated session (via next-auth cookie)
 * - Adds x-needs-token-refresh header for routes that use OAuth
 * - Lets the route handlers handle the actual refresh via the utility
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only intercept API routes that need OAuth tokens
  const protectedPaths = ['/api/emails', '/api/email-sync', '/api/calendar']
  const needsToken = protectedPaths.some((p) => pathname.startsWith(p))

  if (!needsToken) {
    return NextResponse.next()
  }

  // Check for session token
  const sessionToken = request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value

  // Create the response
  const response = NextResponse.next()

  // Add header so route handlers know if they should check token freshness
  if (sessionToken) {
    response.headers.set('x-session-token-present', 'true')
    response.headers.set('x-needs-token-refresh', 'true')
  }

  return response
}

export const config = {
  matcher: [
    '/api/emails/:path*',
    '/api/email-sync/:path*',
    '/api/calendar/:path*',
  ],
}
