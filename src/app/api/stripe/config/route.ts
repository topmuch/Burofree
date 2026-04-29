/**
 * Stripe Config API
 *
 * Returns public Stripe configuration and subscription status
 * for the current user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { isStripeConfigured } from '@/lib/stripe'
import { getUserPlan, PLANS } from '@/features/production/stripe/subscription-manager'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const configured = isStripeConfigured()
  const plan = await getUserPlan(auth.user.id)

  // Get current subscription details
  const subscription = await db.subscription.findFirst({
    where: { userId: auth.user.id, status: { in: ['active', 'trialing', 'past_due'] } },
    select: {
      id: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      trialEnd: true,
      gracePeriodEnd: true,
      stripePriceId: true,
    },
  })

  return NextResponse.json({
    configured,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    currentPlan: plan,
    subscription: subscription || null,
    plans: PLANS.map(p => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
      features: p.features,
      maxMembers: p.maxMembers,
    })),
  })
}
