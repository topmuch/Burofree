/**
 * Stripe Billing Portal API
 *
 * Creates a Stripe Customer Portal session for self-service
 * subscription management (update card, view invoices, cancel).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { createPortalSession } from '@/features/production/stripe/subscription-manager'
import { isStripeConfigured } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimitId = getRateLimitIdentifier(req, auth.user.id)
  const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe n\'est pas configuré' },
      { status: 503 }
    )
  }

  try {
    const url = await createPortalSession(auth.user.id)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[Stripe Portal] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création du portail' },
      { status: 500 }
    )
  }
}
