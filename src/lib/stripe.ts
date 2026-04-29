/**
 * Stripe Client Wrapper for Burozen
 *
 * Provides utility functions for Stripe payment integration.
 * Works gracefully when Stripe is not configured (uses mock key).
 * Supports multiple currencies and proper amount formatting.
 */

import Stripe from 'stripe'

// ─── Stripe Client ────────────────────────────────────────────────────────────────

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

// ─── Configuration Check ──────────────────────────────────────────────────────────

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY
  return !!key && key.startsWith('sk_live_') || !!key && key.startsWith('sk_test_') && key !== 'sk_test_mock'
}

// ─── Checkout Session ─────────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for an invoice.
 * Returns the checkout URL for client-side redirection.
 */
export async function createCheckoutSession(
  invoiceId: string,
  amount: number,
  currency: string,
  clientEmail: string,
): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe n\'est pas configur\u00e9. Veuillez ajouter votre cl\u00e9 Stripe.')
  }

  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const normalizedCurrency = currency.toLowerCase()

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: clientEmail,
    line_items: [
      {
        price_data: {
          currency: normalizedCurrency,
          product_data: {
            name: `Facture ${invoiceId}`,
            description: `Paiement de la facture ${invoiceId}`,
          },
          unit_amount: formatAmountForStripe(amount, currency),
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/?payment=success&invoice=${invoiceId}`,
    cancel_url: `${origin}/?payment=cancelled&invoice=${invoiceId}`,
    metadata: {
      invoiceId,
    },
  })

  return session.url || ''
}

// ─── Webhook Verification ─────────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature.
 * Returns the parsed event if valid.
 */
export async function verifyWebhookSignature(
  payload: string,
  sig: string,
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  return event
}

// ─── Amount Formatting ────────────────────────────────────────────────────────────

/**
 * Convert a decimal amount to Stripe's smallest currency unit (cents).
 * Most currencies use 2 decimal places; JPY uses 0.
 */
export function formatAmountForStripe(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND']
  const normalized = currency.toUpperCase()

  if (zeroDecimalCurrencies.includes(normalized)) {
    return Math.round(amount)
  }

  return Math.round(amount * 100)
}

/**
 * Convert from Stripe's smallest currency unit back to decimal.
 */
export function formatAmountFromStripe(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND']
  const normalized = currency.toUpperCase()

  if (zeroDecimalCurrencies.includes(normalized)) {
    return amount
  }

  return amount / 100
}
