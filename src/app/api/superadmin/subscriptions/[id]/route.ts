/**
 * GET   /api/superadmin/subscriptions/[id] — Get subscription detail.
 * PATCH /api/superadmin/subscriptions/[id] — Manually adjust a subscription.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { subscriptionAdjustSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const { id } = await params

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            role: true,
            stripeCustomerId: true,
          },
        },
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Abonnement introuvable.' },
        { status: 404 }
      )
    }

    // Fetch related invoices
    const invoices = await db.invoice.findMany({
      where: {
        userId: subscription.userId,
        status: 'paid',
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
      select: {
        id: true,
        number: true,
        total: true,
        currency: true,
        status: true,
        paidAt: true,
      },
    })

    // Check for active impersonation on this user
    const activeImpersonation = await db.impersonationSession.findFirst({
      where: { targetUserId: subscription.userId, endedAt: null, expiresAt: { gt: new Date() } },
    })

    await logAdminAction(admin.id, 'admin.subscription_detail', 'subscription', id, undefined, req)

    return NextResponse.json({
      subscription,
      invoices,
      isBeingImpersonated: !!activeImpersonation,
    })
  } catch (error) {
    console.error('[SuperAdmin Subscription GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de l\'abonnement.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const { id } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = subscriptionAdjustSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { action, reason, priceId, creditAmount, trialDays } = parsed.data

    // Verify subscription exists
    const subscription = await db.subscription.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Abonnement introuvable.' },
        { status: 404 }
      )
    }

    const updateData: Prisma.SubscriptionUpdateInput = {}
    const metadata: Record<string, unknown> = { action, reason, previousStatus: subscription.status }

    switch (action) {
      case 'cancel': {
        updateData.status = 'canceled'
        updateData.canceledAt = new Date()
        updateData.cancelAtPeriodEnd = true
        break
      }

      case 'reactivate': {
        if (subscription.status !== 'canceled' && subscription.status !== 'past_due') {
          return NextResponse.json(
            { error: 'Seuls les abonnements annulés ou en retard peuvent être réactivés.' },
            { status: 400 }
          )
        }
        updateData.status = 'active'
        updateData.canceledAt = null
        updateData.cancelAtPeriodEnd = false
        break
      }

      case 'upgrade':
      case 'downgrade': {
        if (!priceId) {
          return NextResponse.json(
            { error: 'Un priceId est requis pour un changement de plan.' },
            { status: 400 }
          )
        }
        updateData.stripePriceId = priceId
        metadata.previousPriceId = subscription.stripePriceId
        metadata.newPriceId = priceId
        break
      }

      case 'extend_trial': {
        if (!trialDays) {
          return NextResponse.json(
            { error: 'Le nombre de jours d\'extension est requis.' },
            { status: 400 }
          )
        }
        const newTrialEnd = subscription.trialEnd
          ? new Date(Math.max(subscription.trialEnd.getTime(), Date.now()) + trialDays * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
        updateData.trialEnd = newTrialEnd
        updateData.status = 'trialing'
        metadata.trialDays = trialDays
        break
      }

      case 'apply_credit': {
        if (creditAmount === undefined || creditAmount <= 0) {
          return NextResponse.json(
            { error: 'Le montant du crédit doit être supérieur à 0.' },
            { status: 400 }
          )
        }
        // Create a credit invoice
        await db.invoice.create({
          data: {
            number: `CREDIT-${Date.now()}`,
            type: 'credit',
            clientName: subscription.user.email,
            items: JSON.stringify([{ description: `Crédit administrateur: ${reason}`, amount: -creditAmount }]),
            subtotal: -creditAmount,
            taxRate: 0,
            taxAmount: 0,
            total: -creditAmount,
            currency: 'EUR',
            status: 'paid',
            paidAt: new Date(),
            userId: subscription.userId,
            notes: `Crédit appliqué par ${admin.email}: ${reason}`,
          },
        })
        metadata.creditAmount = creditAmount
        break
      }

      case 'free_month': {
        // Extend current period by one month
        const newPeriodEnd = new Date(subscription.currentPeriodEnd)
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
        updateData.currentPeriodEnd = newPeriodEnd
        metadata.newPeriodEnd = newPeriodEnd.toISOString()
        break
      }

      default:
        return NextResponse.json(
          { error: 'Action non reconnue.' },
          { status: 400 }
        )
    }

    // Apply updates if any
    if (Object.keys(updateData).length > 0) {
      await db.subscription.update({
        where: { id },
        data: updateData,
      })
    }

    await logAdminAction(admin.id, `admin.subscription_${action}`, 'subscription', id, metadata, req)

    // Fetch updated subscription
    const updated = await db.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    return NextResponse.json({
      message: 'Abonnement mis à jour avec succès.',
      subscription: updated,
    })
  } catch (error) {
    console.error('[SuperAdmin Subscription PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'abonnement.' },
      { status: 500 }
    )
  }
}
