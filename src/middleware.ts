import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyInvoiceToken } from '@/lib/invoice-token'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, DEFAULT_AUTH_OPTIONS } from '@/lib/rate-limit'

/**
 * Maellis Middleware
 *
 * Handles:
 * 1. OAuth token refresh headers for email/calendar routes
 * 2. API route authentication enforcement
 * 3. Public route whitelisting (health, stripe webhook, team accept, DPO contact)
 * 4. Invoice PDF token-based auth (alternative to session cookie)
 * 5. Rate limiting
 * 6. 2FA-protected route enforcement
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth',        // NextAuth routes (login, callback, etc.)
  '/api/',            // Root API health check (exact match handled separately)
  '/api/health',      // Health check endpoint (monitoring)
  '/api/stripe/webhook', // Stripe webhooks (uses signature verification, not session)
  '/api/teams/accept',   // Team invitation acceptance (GET redirect from email)
  '/api/dpo/contact',    // DPO contact form (public submission)
  '/api/roles/seed',     // Role seeding (superadmin, has its own auth)
]

// Routes that require 2FA if the user has it enabled
const TWO_FA_REQUIRED_ROUTES = [
  '/api/security/2fa/disable',
  '/api/security/encryption/rotate',
  '/api/gdpr/delete',
  '/api/export',
]

// Routes that need OAuth token refresh headers
const OAUTH_ROUTES = ['/api/emails', '/api/calendar']

/**
 * Check if a path matches the invoice PDF pattern /api/invoices/[id]/pdf
 * and if so, extract the invoice ID.
 */
function matchInvoicePdfPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/invoices\/([^/]+)\/pdf$/)
  return match ? match[1] : null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Root API health check - allow without auth
  if (pathname === '/api') {
    return NextResponse.next()
  }

  // 2. NextAuth routes - allow without auth
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // 2b. Public API routes (health check, stripe webhook, team accept, DPO contact, portal, roles/seed, campaign tracking)
  if (
    pathname === '/api/health' ||
    pathname === '/api/stripe/webhook' ||
    pathname.startsWith('/api/teams/accept') ||
    pathname === '/api/dpo/contact' ||
    pathname.startsWith('/api/portal/') ||
    pathname === '/api/roles/seed' ||
    pathname.startsWith('/api/crm/campaigns/track/') ||
    pathname.startsWith('/api/crm/campaigns/unsubscribe') ||
    pathname.startsWith('/api/webhooks/')
  ) {
    return NextResponse.next()
  }

  // 3. Non-API routes - pass through (client-side auth handled by components)
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 4. Invoice PDF route with token-based auth
  //    Allows access via a valid HMAC token as an alternative to session cookie.
  //    This is needed because window.open() in a new tab may not carry session cookies.
  const invoiceId = matchInvoicePdfPath(pathname)
  if (invoiceId) {
    const token = request.nextUrl.searchParams.get('token')
    if (token && await verifyInvoiceToken(invoiceId, token)) {
      return NextResponse.next()
    }
  }

  // 5. All other API routes - check for session token
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

  // After confirming session token exists, check rate limit
  const rateLimitId = getRateLimitIdentifier(request)
  // Use stricter limits for auth-related endpoints
  const isAuthRoute = pathname.startsWith('/api/auth/credentials')
  const rateOptions = isAuthRoute ? DEFAULT_AUTH_OPTIONS : DEFAULT_API_OPTIONS
  const rateCheck = checkRateLimit(rateLimitId, rateOptions)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
      { status: 429 }
    )
  }

  // 7. Superadmin route protection — check role from session
  if (pathname.startsWith('/api/superadmin/')) {
    // Decode JWT to check role without DB call
    try {
      const { decode } = await import('next-auth/jwt')
      const decoded = await decode({
        token: sessionToken,
        secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'maellis-dev-secret-key-do-not-use-in-prod' : ''),
      })
      if (decoded?.role !== 'superadmin') {
        return NextResponse.json(
          { error: 'Accès refusé. Privilèges superadmin requis.' },
          { status: 403 }
        )
      }
      if (decoded?.suspended) {
        return NextResponse.json(
          { error: 'Compte suspendu.' },
          { status: 403 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Session invalide.' },
        { status: 401 }
      )
    }
  }

  // 6. Add OAuth token refresh headers for specific routes
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
