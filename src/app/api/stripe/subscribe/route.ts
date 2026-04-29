/**
 * Stripe Subscription Checkout API
 *
 * POST /api/stripe/subscribe
 * - Creates a Stripe Checkout session for subscription plans
 * - Accepts planId and billing period (monthly/annual)
 * - Returns the checkout session URL
 * - Handles both new subscriptions and plan upgrades
 *
 * Security:
 *  - Auth required (user must be logged in)
 *  - Zod validation on inputs
 *  - Rate limited
 *  - Uses existing Stripe configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { getStripePriceId, getPlanById } from '@/features/landing/utils/pricing-data'

// ─── Validation Schema ─────────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  planId: z.enum(['free', 'pro', 'enterprise']),
  period: z.enum(['monthly', 'annual']),
})

// ─── POST Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 },
      )
    }

    // Check Stripe configuration
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Les paiements ne sont pas encore configurés. Contactez support@burozen.com.' },
        { status: 400 },
      )
    }

    // Parse and validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de la requête invalide' },
        { status: 400 },
      )
    }

    const parseResult = subscribeSchema.safeParse(body)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Données invalides' },
        { status: 400 },
      )
    }

    const { planId, period } = parseResult.data

    // Free plan doesn't need checkout
    if (planId === 'free') {
      return NextResponse.json(
        { error: 'Le plan gratuit ne nécessite pas de paiement.' },
        { status: 400 },
      )
    }

    // Get plan details
    const plan = getPlanById(planId)
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan introuvable' },
        { status: 404 },
      )
    }

    // Get Stripe Price ID
    const priceId = getStripePriceId(planId, period)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Configuration de prix introuvable pour ce plan.' },
        { status: 400 },
      )
    }

    // Get or create user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 },
      )
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to user
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create checkout session
    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          userId: user.id,
          planId,
          period,
        },
        trial_period_days: 14, // 14-day free trial for Pro and Enterprise
      },
      metadata: {
        userId: user.id,
        planId,
        period,
      },
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('[stripe/subscribe] Error:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur lors de la création de la session de paiement'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
