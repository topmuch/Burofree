import { NextResponse } from 'next/server'
import { isStripeConfigured } from '@/lib/stripe'

export async function GET() {
  try {
    const configured = isStripeConfigured()
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || ''

    return NextResponse.json({
      configured,
      publishableKey: configured ? publishableKey : '',
    })
  } catch (error) {
    console.error('Stripe config error:', error)
    return NextResponse.json({
      configured: false,
      publishableKey: '',
    })
  }
}
