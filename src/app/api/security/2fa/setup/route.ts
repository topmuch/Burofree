/**
 * POST /api/security/2fa/setup
 * Generate TOTP secret + QR code + backup codes for the authenticated user.
 * Does NOT enable 2FA — user must verify with enable endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getRateLimitIdentifier, checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limit'
import { setup2FA } from '@/features/security/two-factor/service'

const TWO_FA_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 } // 5 per 15 min

export async function POST(req: NextRequest) {
  // Auth check
  const { user, response: authResponse } = await requireAuth(req)
  if (!user) return authResponse!

  // Rate limit
  const rateLimitId = getRateLimitIdentifier(req, `2fa-setup:${user.id}`)
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
    const result = await setup2FA(user.id, user.email)

    return NextResponse.json(
      {
        qrCode: result.qrCode,
        backupCodes: result.backupCodes,
      },
      {
        headers: createRateLimitHeaders(TWO_FA_RATE_LIMIT, rateCheck.remaining),
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la configuration de la 2FA.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
