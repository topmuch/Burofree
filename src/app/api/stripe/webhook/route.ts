/**
 * Enhanced Stripe Webhook Handler
 *
 * Processes all Stripe webhook events with:
 * - Signature verification
 * - Idempotency via WebhookEvent table
 * - Atomic DB updates via Prisma transactions
 * - Rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/stripe'
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handlePaymentFailed,
} from '@/features/production/stripe/subscription-manager'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

// Stricter rate limit for webhooks
const WEBHOOK_RATE_LIMIT = { maxRequests: 50, windowMs: 60 * 1000 }

export async function POST(req: NextRequest) {
  // Rate limit webhooks by IP
  const rateLimitId = getRateLimitIdentifier(req, 'stripe-webhook')
  const rateCheck = checkRateLimit(rateLimitId, WEBHOOK_RATE_LIMIT)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Awaited<ReturnType<typeof verifyWebhookSignature>>
    try {
      event = await verifyWebhookSignature(body, sig)
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Idempotency check — skip if already processed
    const existingEvent = await db.webhookEvent.findUnique({
      where: { eventId: event.id },
    })

    if (existingEvent?.processed) {
      return NextResponse.json({ received: true, idempotent: true })
    }

    // Store event for idempotency tracking
    await db.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
        processed: false,
        payload: body,
        attempts: 1,
      },
      update: {
        attempts: { increment: 1 },
      },
    })

    // Process event
    try {
      await processEvent(event.type, event.data.object as Record<string, unknown>)

      // Mark as processed
      await db.webhookEvent.update({
        where: { eventId: event.id },
        data: { processed: true, processedAt: new Date() },
      })
    } catch (processingError) {
      console.error('[Stripe Webhook] Processing error:', processingError)
      await db.webhookEvent.update({
        where: { eventId: event.id },
        data: {
          error: processingError instanceof Error ? processingError.message : 'Unknown error',
        },
      })
      // Return 500 so Stripe retries
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Fatal error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function processEvent(type: string, data: Record<string, unknown>): Promise<void> {
  switch (type) {
    case 'checkout.session.completed': {
      const userId = (data.metadata as Record<string, string>)?.userId
      if (userId && data.customer && data.id) {
        await handleCheckoutCompleted(
          data.id as string,
          data.customer as string,
          userId,
        )
      }
      break
    }

    case 'customer.subscription.updated': {
      if (data.id) {
        await handleSubscriptionUpdated(data.id as string)
      }
      break
    }

    case 'customer.subscription.deleted': {
      if (data.id) {
        await handleSubscriptionDeleted(data.id as string)
      }
      break
    }

    case 'invoice.paid': {
      const customerId = data.customer as string
      const subscriptionId = data.subscription as string
      if (customerId && subscriptionId) {
        await handleInvoicePaid(customerId, subscriptionId)
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const customerId = data.customer as string
      const subscriptionId = (data.metadata as Record<string, string>)?.subscriptionId || null
      await handlePaymentFailed(customerId, subscriptionId)
      break
    }

    // Legacy invoice payment handling (from P3)
    case 'payment_intent.succeeded': {
      const invoiceId = (data.metadata as Record<string, string>)?.invoiceId
      if (invoiceId) {
        const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
        if (invoice && invoice.status !== 'paid') {
          await db.invoice.update({
            where: { id: invoiceId },
            data: {
              status: 'paid',
              paidAt: new Date(),
              stripePaymentIntentId: data.id as string,
              paymentMethod: 'stripe',
            },
          })
        }
      }
      break
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${type}`)
  }
}
