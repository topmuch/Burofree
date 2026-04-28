/**
 * GET /api/consent — Get user's current consent preferences
 * POST /api/consent — Update consent preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { getUserConsents, logConsent } from '@/features/security/gdpr/service'
import { consentUpdateSchema } from '@/lib/validations/security'
import { getClientIp, getUserAgent } from '@/features/security/audit/logger'

/**
 * GET — Get user's current consent state
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    const consents = await getUserConsents(user.id)

    return NextResponse.json({
      consents: {
        essential: consents.essential ?? true,
        functional: consents.functional ?? false,
        analytics: consents.analytics ?? false,
        marketing: consents.marketing ?? false,
      },
    })
  } catch (error) {
    console.error('Consent GET error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des préférences de consentement' },
      { status: 500 }
    )
  }
}

/**
 * POST — Update consent preferences
 * Body: { consents: { analytics: boolean, functional: boolean, marketing: boolean } }
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    // Validate input
    const body = await req.json()
    const parsed = consentUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { consents } = parsed.data
    const ipAddress = getClientIp(req)
    const userAgent = getUserAgent(req)

    // Log each consent change
    const consentEntries = Object.entries(consents) as [string, boolean | undefined][]
    for (const [type, value] of consentEntries) {
      if (value === undefined) continue
      if (type === 'essential') continue // Essential cannot be changed

      const action = value ? 'granted' : 'revoked'
      await logConsent(user.id, type, action, ipAddress, userAgent)
    }

    // Return updated state
    const updatedConsents = await getUserConsents(user.id)

    return NextResponse.json({
      message: 'Préférences de consentement mises à jour',
      consents: {
        essential: updatedConsents.essential ?? true,
        functional: updatedConsents.functional ?? false,
        analytics: updatedConsents.analytics ?? false,
        marketing: updatedConsents.marketing ?? false,
      },
    })
  } catch (error) {
    console.error('Consent POST error:', error)

    if (error instanceof Error && error.message.includes('Invalid consent type')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des préférences de consentement' },
      { status: 500 }
    )
  }
}
