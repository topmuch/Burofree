import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/stripe'

export async function POST(req: NextRequest) {
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
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Record<string, unknown>
        const invoiceId = session.metadata as Record<string, string> | undefined

        if (invoiceId?.invoiceId) {
          // Update invoice status to paid
          const invoice = await db.invoice.findUnique({
            where: { id: invoiceId.invoiceId },
          })

          if (invoice) {
            await db.invoice.update({
              where: { id: invoiceId.invoiceId },
              data: {
                status: 'paid',
                paidAt: new Date(),
                stripePaymentIntentId: (session.payment_intent as string) || null,
                paymentMethod: 'stripe',
              },
            })

            // Create notification
            await db.notification.create({
              data: {
                title: 'Paiement re\u00e7u',
                message: `Facture ${invoice.number} pay\u00e9e via Stripe (${invoice.total.toFixed(2)} ${invoice.currency})`,
                type: 'success',
                channel: 'in_app',
                userId: invoice.userId,
                actionUrl: '#invoices',
              },
            })
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Record<string, unknown>
        const invoiceId = paymentIntent.metadata as Record<string, string> | undefined

        if (invoiceId?.invoiceId) {
          const invoice = await db.invoice.findUnique({
            where: { id: invoiceId.invoiceId },
          })

          if (invoice && invoice.status !== 'paid') {
            await db.invoice.update({
              where: { id: invoiceId.invoiceId },
              data: {
                status: 'paid',
                paidAt: new Date(),
                stripePaymentIntentId: paymentIntent.id as string,
                paymentMethod: 'stripe',
              },
            })

            await db.notification.create({
              data: {
                title: 'Paiement confirm\u00e9',
                message: `Paiement Stripe confirm\u00e9 pour la facture ${invoice.number}`,
                type: 'success',
                channel: 'in_app',
                userId: invoice.userId,
                actionUrl: '#invoices',
              },
            })
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object as Record<string, unknown>
        const invoiceId = failedPayment.metadata as Record<string, string> | undefined

        if (invoiceId?.invoiceId) {
          const invoice = await db.invoice.findUnique({
            where: { id: invoiceId.invoiceId },
          })

          if (invoice) {
            await db.notification.create({
              data: {
                title: '\u00c9chec de paiement',
                message: `Le paiement Stripe a \u00e9chou\u00e9 pour la facture ${invoice.number}`,
                type: 'error',
                channel: 'in_app',
                userId: invoice.userId,
                actionUrl: '#invoices',
              },
            })
          }
        }
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
