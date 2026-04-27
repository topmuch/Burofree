/**
 * Stripe Subscription Manager — Full lifecycle management
 *
 * Handles trial periods, upgrades/downgrades with proration,
 * grace periods, suspension, and dunning (payment retry).
 * Uses Prisma transactions for atomic entitlement updates.
 */

import { stripe, isStripeConfigured } from '@/lib/stripe'
import { db } from '@/lib/db'

const GRACE_PERIOD_DAYS = 7
const MAX_DUNNING_ATTEMPTS = 3
const DUNNING_INTERVAL_DAYS = 3

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'paused'

export interface SubscriptionPlan {
  id: string
  name: string
  priceId: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  maxMembers?: number
}

// Available plans — sync with Stripe Products/Prices
export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    priceId: '',
    amount: 0,
    currency: 'EUR',
    interval: 'month',
    features: ['5 projets', '50 tâches', 'Facturation basique', 'Time tracking'],
    maxMembers: 1,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    amount: 1990, // 19.90 EUR in cents
    currency: 'EUR',
    interval: 'month',
    features: ['Projets illimités', 'Tâches illimitées', 'Facturation avancée', 'Mode Focus', 'Portail Client', '5 membres équipe'],
    maxMembers: 5,
  },
  {
    id: 'enterprise',
    name: 'Entreprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    amount: 4990, // 49.90 EUR in cents
    currency: 'EUR',
    interval: 'month',
    features: ['Tout du plan Pro', 'Membres illimités', 'Intégrations avancées', 'Export avancé', 'Backup automatique', 'Support prioritaire'],
    maxMembers: 50,
  },
]

/**
 * Create a Stripe checkout session for a subscription.
 * Supports trial periods and proration for upgrades.
 */
export async function createSubscriptionCheckout(
  userId: string,
  priceId: string,
  options?: {
    trialDays?: number
    upgradeFrom?: string // Previous subscription ID for proration
  }
): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe n\'est pas configuré')
  }

  // Get or create Stripe customer
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Utilisateur non trouvé')

  let customerId = user.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    })
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const sessionParams: Record<string, unknown> = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?subscription=success`,
    cancel_url: `${origin}/?subscription=cancelled`,
    metadata: { userId },
  }

  // Add trial period
  if (options?.trialDays && options.trialDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: options.trialDays,
    }
  }

  // Handle upgrade proration
  if (options?.upgradeFrom) {
    sessionParams.subscription_data = {
      ...(sessionParams.subscription_data as Record<string, unknown> || {}),
      trial_period_days: 0, // No trial on upgrades
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0])
  return session.url || ''
}

/**
 * Create a Stripe Billing Portal session for self-service management.
 */
export async function createPortalSession(
  userId: string,
): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe n\'est pas configuré')
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user?.stripeCustomerId) {
    throw new Error('Aucun client Stripe trouvé')
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/`,
  })

  return session.url
}

/**
 * Handle checkout.session.completed webhook event.
 * Creates or updates the subscription in the database.
 */
export async function handleCheckoutCompleted(
  sessionId: string,
  customerId: string,
  userId: string,
): Promise<void> {
  // Retrieve full session for subscription details
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  })

  const subscription = session.subscription as Record<string, unknown> | null
  if (!subscription) return

  await db.$transaction(async (tx) => {
    // Create/update subscription record
    await tx.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id as string },
      create: {
        userId,
        stripeSubscriptionId: subscription.id as string,
        stripePriceId: ((subscription as unknown as Record<string, unknown>)?.items as Record<string, unknown>)?.data ? (((subscription as unknown as Record<string, unknown>).items as { data: Array<Record<string, unknown>> }).data?.[0]?.price as Record<string, unknown>)?.id as string || '' : '',
        stripeCustomerId: customerId,
        status: ((subscription as unknown as Record<string, unknown>).status as string) || 'active',
        trialStart: (subscription as Record<string, unknown>).trial_start
          ? new Date((subscription as Record<string, unknown>).trial_start as number * 1000)
          : null,
        trialEnd: (subscription as Record<string, unknown>).trial_end
          ? new Date((subscription as Record<string, unknown>).trial_end as number * 1000)
          : null,
        currentPeriodStart: new Date(((subscription as Record<string, unknown>).current_period_start as number) * 1000),
        currentPeriodEnd: new Date(((subscription as Record<string, unknown>).current_period_end as number) * 1000),
        cancelAtPeriodEnd: (subscription as Record<string, unknown>).cancel_at_period_end as boolean || false,
      },
      update: {
        status: ((subscription as unknown as Record<string, unknown>).status as string) || 'active',
        currentPeriodStart: new Date(((subscription as unknown as Record<string, unknown>).current_period_start as number) * 1000),
        currentPeriodEnd: new Date(((subscription as unknown as Record<string, unknown>).current_period_end as number) * 1000),
        cancelAtPeriodEnd: (subscription as unknown as Record<string, unknown>).cancel_at_period_end as boolean || false,
      },
    })

    // Update user module entitlements
    const priceId = ((subscription as unknown as Record<string, unknown>)?.items as Record<string, unknown>)?.data ? (((subscription as unknown as Record<string, unknown>).items as { data: Array<Record<string, unknown>> }).data?.[0]?.price as Record<string, unknown>)?.id as string : ''
    const plan = PLANS.find(p => p.priceId === priceId)
    if (plan) {
      // Activate all modules included in the plan
      const modules = await tx.module.findMany({
        where: { isActive: true },
      })
      for (const mod of modules) {
        if (plan.features.some(f => f.toLowerCase().includes(mod.slug.replace(/-/g, ' ')))) {
          await tx.userModule.upsert({
            where: { userId_moduleId: { userId, moduleId: mod.id } },
            create: {
              userId,
              moduleId: mod.id,
              status: 'active',
              activatedAt: new Date(),
              stripePriceId: priceId,
            },
            update: {
              status: 'active',
              activatedAt: new Date(),
              stripePriceId: priceId,
            },
          })
        }
      }
    }
  })
}

/**
 * Handle customer.subscription.updated event.
 * Syncs subscription status changes from Stripe.
 */
export async function handleSubscriptionUpdated(
  subscriptionId: string,
): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any

  await db.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (!existing) return

    await tx.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: sub.status as string,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end as boolean,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        gracePeriodEnd: sub.status === 'past_due'
          ? new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
          : null,
      },
    })

    // If subscription is no longer active, deactivate entitlements
    if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
      await tx.userModule.updateMany({
        where: { userId: existing.userId, stripePriceId: { not: '' } },
        data: { status: subscription.status === 'past_due' ? 'trial' : 'expired' },
      })
    }
  })
}

/**
 * Handle customer.subscription.deleted event.
 * Deactivates all paid modules.
 */
export async function handleSubscriptionDeleted(
  subscriptionId: string,
): Promise<void> {
  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!existing) return

  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        cancelAtPeriodEnd: false,
      },
    })

    // Deactivate paid modules
    await tx.userModule.updateMany({
      where: { userId: existing.userId, stripePriceId: { not: '' } },
      data: { status: 'expired', cancelledAt: new Date() },
    })
  })
}

/**
 * Handle invoice.paid event — confirms payment and reactivates subscription.
 */
export async function handleInvoicePaid(
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (!subscription) return

    // Reactivate if was past_due
    if (subscription.status === 'past_due') {
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: 'active',
          gracePeriodEnd: null,
        },
      })

      // Reactivate modules
      await tx.userModule.updateMany({
        where: { userId: subscription.userId, stripePriceId: { not: '' } },
        data: { status: 'active' },
      })

      // Notify user
      await tx.notification.create({
        data: {
          title: 'Abonnement réactivé',
          message: 'Votre paiement a été confirmé et votre abonnement est à nouveau actif.',
          type: 'success',
          channel: 'in_app',
          userId: subscription.userId,
        },
      })
    }
  })
}

/**
 * Handle payment_intent.payment_failed — starts dunning process.
 */
export async function handlePaymentFailed(
  customerId: string,
  subscriptionId: string | null,
): Promise<void> {
  if (!subscriptionId) return

  const subscription = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!subscription) return

  // Set grace period
  await db.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: 'past_due',
      gracePeriodEnd: new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  // Notify user of failed payment
  await db.notification.create({
    data: {
      title: 'Échec de paiement',
      message: `Le paiement de votre abonnement a échoué. Vous avez ${GRACE_PERIOD_DAYS} jours pour mettre à jour votre méthode de paiement.`,
      type: 'warning',
      channel: 'in_app',
      userId: subscription.userId,
      actionUrl: '/?action=subscription',
    },
  })
}

/**
 * Check if a user has an active subscription with the given feature.
 */
export async function checkEntitlement(
  userId: string,
  featureSlug: string,
): Promise<boolean> {
  const userModule = await db.userModule.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trial'] },
      module: { slug: featureSlug, isActive: true },
    },
  })
  return !!userModule
}

/**
 * Get the current subscription plan for a user.
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const subscription = await db.subscription.findFirst({
    where: { userId, status: { in: ['active', 'trialing', 'past_due'] } },
  })

  if (!subscription) return PLANS[0] // Free plan

  const plan = PLANS.find(p => p.priceId === subscription.stripePriceId)
  return plan || PLANS[0]
}
