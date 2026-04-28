/**
 * Pricing Plans API — Public endpoint for landing page pricing data
 *
 * GET /api/landing/pricing
 * - Returns all pricing plans with Stripe price IDs
 * - Includes monthly & annual prices
 * - Public endpoint — no auth required
 */

import { NextResponse } from 'next/server'
import {
  PRICING_PLANS,
  getAnnualSavingsPercent,
  type PricingPlan,
} from '@/features/landing/utils/pricing-data'

interface PricingPlanResponse extends Omit<PricingPlan, 'stripePriceIdMonthly' | 'stripePriceIdAnnual'> {
  stripePriceId: {
    monthly: string
    annual: string
  }
  annualSavingsPercent: number
  annualMonthlyEquivalent: number
  checkoutUrl: {
    monthly: string
    annual: string
  }
}

export async function GET() {
  try {
    const plans: PricingPlanResponse[] = PRICING_PLANS.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      stripePriceId: {
        monthly: plan.stripePriceIdMonthly,
        annual: plan.stripePriceIdAnnual,
      },
      features: plan.features,
      cta: plan.cta,
      popular: plan.popular,
      badge: plan.badge,
      annualSavingsPercent: getAnnualSavingsPercent(plan),
      annualMonthlyEquivalent:
        plan.annualPrice > 0
          ? Math.round((plan.annualPrice / 12) * 100) / 100
          : 0,
      checkoutUrl: {
        monthly: `/api/stripe/checkout?plan=${plan.id}&period=monthly`,
        annual: `/api/stripe/checkout?plan=${plan.id}&period=annual`,
      },
    }))

    return NextResponse.json({
      plans,
      currency: 'EUR',
      billingPeriods: ['monthly', 'annual'] as const,
      defaultPeriod: 'annual',
    })
  } catch (error) {
    console.error('[pricing] Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des tarifs' },
      { status: 500 },
    )
  }
}
