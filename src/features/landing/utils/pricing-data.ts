/**
 * Pricing Plans Data — Shared between server and client
 *
 * Central source of truth for Maellis pricing tiers.
 * Used by the pricing API route and landing page components.
 * Annual prices apply a 20% discount (monthly × 12 × 0.8).
 */

export interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  stripePriceIdMonthly: string
  stripePriceIdAnnual: string
  features: string[]
  cta: string
  popular: boolean
  badge?: string
}

const SITE_URL = process.env.NEXTAUTH_URL || 'https://maellis.com'

/**
 * Complete pricing plans for Maellis.
 * Stripe Price IDs are read from environment variables so they can
 * differ between staging and production without a code change.
 */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Pour découvrir Maellis et gérer vos premières missions.',
    monthlyPrice: 0,
    annualPrice: 0,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_FREE_MONTHLY || 'price_free_monthly',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_FREE_ANNUAL || 'price_free_annual',
    features: [
      'Jusqu\'à 3 projets actifs',
      'Gestion des tâches & rappels',
      'Calendrier basique',
      'Facturation (3 factures/mois)',
      'Suivi du temps (basique)',
      'Assistant IA (5 requêtes/jour)',
      'Stockage 500 Mo',
    ],
    cta: 'Commencer gratuitement',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Pour les freelances qui veulent automatiser et scaler.',
    monthlyPrice: 19,
    annualPrice: Math.round(19 * 12 * 0.8 * 100) / 100, // 182.40 €
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
    features: [
      'Projets illimités',
      'Gestion des tâches avancée (tags, priorités, récurrence)',
      'Calendrier synchronisé (Google, Outlook)',
      'Facturation illimitée + relances auto',
      'Suivi du temps avancé + rapports',
      'Assistant IA illimité',
      'Mode Focus & sons ambiants',
      'Templates & automatisations',
      'Portail client',
      'Stockage 10 Go',
    ],
    cta: 'Essai gratuit 14 jours',
    popular: true,
    badge: 'Le plus populaire',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Pour les équipes et cabinets qui need collaboration & support dédié.',
    monthlyPrice: 49,
    annualPrice: Math.round(49 * 12 * 0.8 * 100) / 100, // 470.40 €
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_enterprise_annual',
    features: [
      'Tout le plan Pro',
      'Équipes (jusqu\'à 25 membres)',
      'Permissions & rôles avancés',
      'Intégrations Slack, GitHub, Notion, Zoom',
      'Backup automatisé & restauration',
      'Export/Import complet (CSV, JSON, PDF)',
      'Support prioritaire (chat & email)',
      'Facturation d\'équipe centralisée',
      'Audit logs & conformité',
      'Stockage 100 Go',
      'SLA 99.9%',
    ],
    cta: 'Contacter l\'équipe',
    popular: false,
    badge: 'Sur mesure',
  },
]

/**
 * Build the Stripe Checkout URL for a given plan and billing period.
 * The actual checkout is handled by the /api/stripe/checkout endpoint,
 * but this helper provides the client-side construction pattern.
 */
export function getCheckoutUrl(planId: string, period: 'monthly' | 'annual'): string {
  return `${SITE_URL}/api/stripe/checkout?plan=${planId}&period=${period}`
}

/**
 * Get a plan by its ID.
 */
export function getPlanById(planId: string): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === planId)
}

/**
 * Get the Stripe Price ID for a plan and billing period.
 */
export function getStripePriceId(planId: string, period: 'monthly' | 'annual'): string | undefined {
  const plan = getPlanById(planId)
  if (!plan) return undefined
  return period === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdAnnual
}

/**
 * Calculate the savings percentage when choosing annual billing.
 */
export function getAnnualSavingsPercent(plan: PricingPlan): number {
  if (plan.monthlyPrice === 0) return 0
  const monthlyAnnualTotal = plan.monthlyPrice * 12
  return Math.round(((monthlyAnnualTotal - plan.annualPrice) / monthlyAnnualTotal) * 100)
}
