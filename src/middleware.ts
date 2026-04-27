import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Burofree Middleware
 *
 * Handles:
 * 1. OAuth token refresh headers for email/calendar routes
 * 2. API route authentication enforcement
 * 3. Public route whitelisting
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth',        // NextAuth routes (login, callback, etc.)
  '/api/',            // Root API health check (exact match handled separately)
]

// Routes that need OAuth token refresh headers
const OAUTH_ROUTES = ['/api/emails', '/api/email-sync', '/api/calendar']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Root API health check - allow without auth
  if (pathname === '/api') {
    return NextResponse.next()
  }

  // 2. NextAuth routes - allow without auth
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // 3. Non-API routes - pass through (client-side auth handled by components)
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 4. All other API routes - check for session token
  const sessionToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  if (!sessionToken) {
    // For SSE stream, return a simpler response
    if (pathname === '/api/notifications/stream') {
      return new Response('Unauthorized', { status: 401 })
    }
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous connecter.' },
      { status: 401 }
    )
  }

  // 5. Add OAuth token refresh headers for specific routes
  const needsToken = OAUTH_ROUTES.some((p) => pathname.startsWith(p))

  const response = NextResponse.next()

  if (needsToken) {
    response.headers.set('x-session-token-present', 'true')
    response.headers.set('x-needs-token-refresh', 'true')
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
