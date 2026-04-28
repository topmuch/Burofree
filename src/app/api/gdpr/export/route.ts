/**
 * GET /api/gdpr/export — Export all user data as JSON (GDPR Art. 15 & 20)
 * Rate limited: 1 export per day per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { exportUserData } from '@/features/security/gdpr/service'
import { logSecurityAction } from '@/features/security/audit/logger'

// Strict rate limit: 1 export per 24 hours
const EXPORT_RATE_LIMIT = { maxRequests: 1, windowMs: 24 * 60 * 60 * 1000 }

export async function GET(req: NextRequest) {
  try {
    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    // Rate limit — 1 export per day per user
    const rateLimitId = getRateLimitIdentifier(req, `gdpr-export:${user.id}`)
    const rateLimit = checkRateLimit(rateLimitId, EXPORT_RATE_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Limite d\'export atteinte. Un export par jour maximum.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
        }
      )
    }

    // Export user data
    const data = await exportUserData(user.id)

    // Return as downloadable JSON
    const filename = `burofree-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-RateLimit-Limit': String(EXPORT_RATE_LIMIT.maxRequests),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    })
  } catch (error) {
    console.error('GDPR export error:', error)

    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données' },
      { status: 500 }
    )
  }
}
