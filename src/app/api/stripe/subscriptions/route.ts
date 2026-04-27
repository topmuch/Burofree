/**
 * Stripe Subscription Checkout API
 *
 * Creates a checkout session for subscribing to a plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { createSubscriptionCheckout, PLANS } from '@/features/production/stripe/subscription-manager'
import { isStripeConfigured } from '@/lib/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
  planId: z.enum(['pro', 'enterprise']),
  trialDays: z.number().int().min(0).max(30).optional(),
})

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
      { error: 'Stripe n\'est pas configuré. Veuillez contacter le support.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  }

  const { planId, trialDays } = parsed.data
  const plan = PLANS.find(p => p.id === planId)

  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 })
  }

  try {
    const url = await createSubscriptionCheckout(auth.user.id, plan.priceId, {
      trialDays,
    })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création de la session' },
      { status: 500 }
    )
  }
}
