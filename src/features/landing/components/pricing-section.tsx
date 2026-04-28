'use client'

/**
 * Pricing Section — Conversion-optimized pricing with Stripe integration
 *
 * Features:
 *  - Monthly/Annual toggle with -20% annual discount
 *  - Animated price transitions
 *  - "Populaire" badge on Pro plan
 *  - CTA buttons wired to Stripe subscription checkout
 *  - Free plan → direct link to /app
 *  - Enterprise plan → contact link
 *  - Pricing data from shared pricing-data.ts (single source of truth)
 *  - CTA tracking events
 *  - Accessible: switch role, ARIA labels, keyboard navigation
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { PRICING_PLANS, type PricingPlan } from '../utils/pricing-data'
import { trackCTAClick, trackEvent } from '../utils/tracking'

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const prefersReducedMotion = useReducedMotion() ?? false

  const toggleBilling = useCallback(() => {
    const newAnnual = !annual
    setAnnual(newAnnual)
    trackEvent('pricing_toggle', { period: newAnnual ? 'annual' : 'monthly' })
  }, [annual])

  const handleSubscribe = useCallback(async (plan: PricingPlan) => {
    const period = annual ? 'annual' : 'monthly'

    trackCTAClick(`pricing_${plan.id}_${period}`, 'pricing')

    // Free plan: redirect directly
    if (plan.id === 'free') {
      window.location.href = '/app'
      return
    }

    // Enterprise: contact
    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:hello@burofree.com?subject=Demande%20plan%20Enterprise'
      return
    }

    // Pro: Stripe checkout
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, period }),
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        // Fallback: redirect to app with error message
        console.error('[pricing] Checkout error:', data.error)
        window.location.href = `/app?checkout=error&message=${encodeURIComponent(data.error || 'Erreur de paiement')}`
      }
    } catch (error) {
      console.error('[pricing] Network error:', error)
      window.location.href = '/app?checkout=error'
    }
  }, [annual])

  return (
    <section
      className="relative py-20 sm:py-28 bg-muted/30"
      aria-labelledby="pricing-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Des tarifs simples et transparents
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Pas de frais cachés, pas d&apos;engagement. Changez de plan à tout moment.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <span
            className={`text-sm font-medium transition-colors ${
              !annual ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Mensuel
          </span>

          <button
            onClick={toggleBilling}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
              annual ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            }`}
            role="switch"
            aria-checked={annual}
            aria-label="Basculer entre facturation mensuelle et annuelle"
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-card shadow-sm transition-transform duration-200 ${
                annual ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          <span
            className={`text-sm font-medium transition-colors ${
              annual ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Annuel
          </span>

          {annual && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            >
              -20%
            </motion.span>
          )}
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan, i) => {
            const displayPrice = plan.monthlyPrice === 0
              ? 0
              : annual
                ? Math.round((plan.annualPrice / 12) * 100) / 100
                : plan.monthlyPrice

            return (
              <motion.div
                key={plan.id}
                custom={i}
                variants={prefersReducedMotion ? undefined : cardVariants}
                initial={prefersReducedMotion ? undefined : 'hidden'}
                whileInView={prefersReducedMotion ? undefined : 'visible'}
                viewport={{ once: true, margin: '-60px' }}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 bg-card transition-shadow duration-300 hover:shadow-xl hover:shadow-emerald-500/5 ${
                  plan.popular
                    ? 'border-emerald-500 dark:border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.02] md:scale-105 z-10'
                    : 'border-border'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-lg">
                      Populaire
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={annual ? 'annual' : 'monthly'}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-baseline gap-1"
                    >
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                        {displayPrice === 0 ? '0€' : `${displayPrice}€`}
                      </span>
                      {displayPrice > 0 && (
                        <span className="text-sm text-muted-foreground">/mois</span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  {annual && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Facturé {plan.annualPrice}€/an
                    </p>
                  )}
                  {plan.id === 'pro' && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      14 jours d&apos;essai gratuit inclus
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-3 mb-8" role="list" aria-label={`Fonctionnalités ${plan.name}`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          plan.popular ? 'text-emerald-500' : 'text-emerald-500/70'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full group inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                    plan.popular
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                      : plan.monthlyPrice === 0
                        ? 'bg-muted text-foreground hover:bg-muted/80'
                        : 'bg-foreground text-background hover:opacity-90'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Trust line */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Paiements sécurisés par Stripe. Annulation en 1 clic. Aucun engagement.
        </p>
      </div>
    </section>
  )
}
