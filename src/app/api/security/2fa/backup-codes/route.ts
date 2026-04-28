/**
 * POST /api/security/2fa/backup-codes
 * Regenerate backup codes for the authenticated user (requires TOTP verification).
 * Body: { token: string }
 * Returns: { backupCodes: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getRateLimitIdentifier, checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limit'
import { regenerateBackupCodes } from '@/features/security/two-factor/service'

const TWO_FA_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 } // 5 per 15 min

export async function POST(req: NextRequest) {
  // Auth check
  const { user, response: authResponse } = await requireAuth(req)
  if (!user) return authResponse!

  // Rate limit
  const rateLimitId = getRateLimitIdentifier(req, `2fa-backup-codes:${user.id}`)
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
        { error: 'Le code TOTP est requis pour régénérer les codes de secours.' },
        { status: 400 }
      )
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               undefined
    const userAgent = req.headers.get('user-agent') || undefined

    const result = await regenerateBackupCodes(user.id, token, ip, userAgent)

    return NextResponse.json(
      { backupCodes: result.backupCodes },
      {
        headers: createRateLimitHeaders(TWO_FA_RATE_LIMIT, rateCheck.remaining),
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la régénération des codes de secours.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
