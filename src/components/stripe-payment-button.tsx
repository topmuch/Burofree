'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Invoice } from '@/lib/store'

interface StripePaymentButtonProps {
  invoice: Invoice
  compact?: boolean
  onPaymentInitiated?: () => void
}

export function StripePaymentButton({ invoice, compact = false, onPaymentInitiated }: StripePaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null)

  // Check if Stripe is configured
  const checkStripeConfig = async () => {
    if (stripeConfigured !== null) return stripeConfigured
    try {
      const res = await fetch('/api/stripe/config')
      if (res.ok) {
        const data = await res.json()
        setStripeConfigured(data.configured)
        return data.configured
      }
    } catch {
      // ignore
    }
    setStripeConfigured(false)
    return false
  }

  const handlePayOnline = async () => {
    setLoading(true)
    try {
      const configured = await checkStripeConfig()
      if (!configured) {
        toast.error('Stripe n\'est pas configur\u00e9. Contactez l\'administrateur.')
        return
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.open(data.url, '_blank')
          toast.success('Redirection vers le paiement Stripe...')
          onPaymentInitiated?.()
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la cr\u00e9ation de la session de paiement')
      }
    } catch {
      toast.error('Erreur de connexion au service de paiement')
    } finally {
      setLoading(false)
    }
  }

  // If already paid via Stripe
  if (invoice.status === 'paid' && invoice.paymentMethod === 'stripe') {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs gap-1">
        <ShieldCheck className="w-3 h-3" />
        Pay\u00e9 via Stripe
      </Badge>
    )
  }

  // If manual payment
  if (invoice.paymentMethod === 'manual' && invoice.status === 'paid') {
    return (
      <Badge className="bg-zinc-500/20 text-zinc-400 text-xs gap-1">
        Pay\u00e9 (manuel)
      </Badge>
    )
  }

  // If invoice has a checkout URL already
  if (invoice.stripeCheckoutUrl) {
    if (compact) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-emerald-400 hover:text-emerald-300"
          onClick={() => window.open(invoice.stripeCheckoutUrl!, '_blank')}
        >
          <CreditCard className="w-3.5 h-3.5 mr-1" />
          Payer en ligne
        </Button>
      )
    }
    return (
      <Button
        variant="outline"
        className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        onClick={() => window.open(invoice.stripeCheckoutUrl!, '_blank')}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Payer en ligne
      </Button>
    )
  }

  // Only show payment button for sent/overdue invoices
  if (invoice.status !== 'sent' && invoice.status !== 'overdue' && invoice.status !== 'draft') {
    return null
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 text-xs',
          loading ? 'text-zinc-400' : 'text-amber-400 hover:text-amber-300'
        )}
        onClick={handlePayOnline}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <CreditCard className="w-3.5 h-3.5 mr-1" />
        )}
        {loading ? 'Chargement...' : 'Payer en ligne'}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
        onClick={handlePayOnline}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        {loading ? 'Cr\u00e9ation du paiement...' : 'Payer en ligne'}
      </Button>
      <div className="flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Paiement s\u00e9curis\u00e9 par Stripe</span>
      </div>
    </div>
  )
}

/**
 * Badge component showing payment method info
 */
export function PaymentMethodBadge({ invoice }: { invoice: Invoice }) {
  if (invoice.paymentMethod === 'stripe' || invoice.stripeCheckoutUrl) {
    return (
      <Badge className="bg-amber-500/20 text-amber-400 text-xs gap-1">
        <CreditCard className="w-3 h-3" />
        Stripe
      </Badge>
    )
  }

  if (invoice.paymentMethod === 'bank_transfer') {
    return (
      <Badge className="bg-zinc-500/20 text-zinc-400 text-xs">
        Virement
      </Badge>
    )
  }

  // Manual/default
  return null
}
