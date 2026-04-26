import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe n\'est pas configur\u00e9. Ajoutez votre cl\u00e9 Stripe dans les param\u00e8tres.' },
        { status: 400 },
      )
    }

    const body = await req.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 })
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { project: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Cette facture est d\u00e9j\u00e0 pay\u00e9e' }, { status: 400 })
    }

    if (!invoice.clientEmail) {
      return NextResponse.json({ error: 'Le client n\'a pas d\'adresse email' }, { status: 400 })
    }

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      invoice.id,
      invoice.total,
      invoice.currency,
      invoice.clientEmail,
    )

    // Save checkout URL to invoice
    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        stripeCheckoutUrl: checkoutUrl,
        paymentMethod: 'stripe',
      },
    })

    return NextResponse.json({
      url: checkoutUrl,
      invoiceId: invoice.id,
    })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    const message = error instanceof Error ? error.message : '\u00c9chec de la cr\u00e9ation de la session de paiement'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
