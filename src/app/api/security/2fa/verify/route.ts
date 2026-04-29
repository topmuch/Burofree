/**
 * POST /api/security/2fa/verify
 * Verify a TOTP token or backup code for the authenticated user.
 * Body: { token: string }
 * Returns: { valid: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getRateLimitIdentifier, checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limit'
import { verify2FAToken } from '@/features/security/two-factor/service'

const TWO_FA_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 } // 5 per 15 min

export async function POST(req: NextRequest) {
  // Auth check
  const { user, response: authResponse } = await requireAuth(req)
  if (!user) return authResponse!

  // Rate limit
  const rateLimitId = getRateLimitIdentifier(req, `2fa-verify:${user.id}`)
  const rateCheck = checkRateLimit(rateLimitId, TWO_FA_RATE_LIMIT)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.' },
      {
        status: 429,
        headers: createRateLimitHeaders(TWO_FA_RATE_LIMIT, rateCheck.remaining, rateCheck.retryAfterMs),
      }
    )
  }

  try {
    const body = await req.json()
    const token = body?.token

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Le code de vérification est requis.' },
        { status: 400 }
      )
    }

    const valid = await verify2FAToken(user.id, token)

    return NextResponse.json(
      { valid },
      {
        headers: createRateLimitHeaders(TWO_FA_RATE_LIMIT, rateCheck.remaining),
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la vérification du code.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
