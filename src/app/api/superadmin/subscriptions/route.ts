/**
 * GET /api/superadmin/subscriptions — List subscriptions with cursor-based pagination.
 *
 * Supports filtering by status and optional financial report generation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { subscriptionSearchSchema, financialReportSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())

    // Check if this is a financial report request
    const isFinancialReport = url.searchParams.get('report') === '1'

    if (isFinancialReport) {
      return handleFinancialReport(admin.id, params, req)
    }

    const parsed = subscriptionSearchSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { status, cursor, limit } = parsed.data

    // Build where clause
    const where: Prisma.SubscriptionWhereInput = {}
    if (status && status !== 'all') {
      where.status = status
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor }
    }

    const [subscriptions, totalCount] = await Promise.all([
      db.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          stripeSubscriptionId: true,
          stripePriceId: true,
          stripeCustomerId: true,
          status: true,
          trialStart: true,
          trialEnd: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          canceledAt: true,
          gracePeriodEnd: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      db.subscription.count({ where }),
    ])

    const hasMore = subscriptions.length > limit
    const trimmedSubs = hasMore ? subscriptions.slice(0, limit) : subscriptions
    const nextCursor = hasMore ? trimmedSubs[trimmedSubs.length - 1].id : null

    await logAdminAction(admin.id, 'admin.subscriptions_list', 'subscription', null, { status, limit }, req)

    return NextResponse.json({
      subscriptions: trimmedSubs,
      pagination: {
        total: totalCount,
        limit,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    console.error('[SuperAdmin Subscriptions GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des abonnements.' },
      { status: 500 }
    )
  }
}

async function handleFinancialReport(
  adminId: string,
  params: Record<string, string>,
  req: NextRequest
): Promise<NextResponse> {
  const parsed = financialReportSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres du rapport financier invalides.', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { period, dateFrom, dateTo } = parsed.data

  // Compute date range
  const now = new Date()
  let startDate: Date
  let endDate: Date = now

  if (dateFrom) {
    startDate = new Date(dateFrom)
  } else {
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }
  }

  if (dateTo) {
    endDate = new Date(dateTo)
  }

  // Aggregation queries
  const [
    totalActive,
    totalTrialing,
    totalCanceled,
    totalPastDue,
    totalUnpaid,
    revenueData,
    churnedCount,
  ] = await Promise.all([
    db.subscription.count({ where: { status: 'active' } }),
    db.subscription.count({ where: { status: 'trialing' } }),
    db.subscription.count({
      where: {
        status: 'canceled',
        canceledAt: { gte: startDate, lte: endDate },
      },
    }),
    db.subscription.count({ where: { status: 'past_due' } }),
    db.subscription.count({ where: { status: 'unpaid' } }),
    db.invoice.findMany({
      where: {
        status: 'paid',
        paidAt: { gte: startDate, lte: endDate },
      },
      select: {
        total: true,
        taxAmount: true,
        currency: true,
        paidAt: true,
      },
      orderBy: { paidAt: 'asc' },
    }),
    db.subscription.count({
      where: {
        status: 'canceled',
        canceledAt: { gte: startDate, lte: endDate },
      },
    }),
  ])

  const totalRevenue = revenueData.reduce((sum, inv) => sum + inv.total, 0)
  const totalTax = revenueData.reduce((sum, inv) => sum + inv.taxAmount, 0)
  const netRevenue = totalRevenue - totalTax

  // Group revenue by day/week/month based on period
  const revenueByPeriod = groupRevenueByPeriod(revenueData, period)

  const report = {
    period,
    dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    subscriptions: {
      active: totalActive,
      trialing: totalTrialing,
      canceled: totalCanceled,
      pastDue: totalPastDue,
      unpaid: totalUnpaid,
    },
    revenue: {
      total: Math.round(totalRevenue * 100) / 100,
      tax: Math.round(totalTax * 100) / 100,
      net: Math.round(netRevenue * 100) / 100,
      currency: 'EUR',
    },
    churn: {
      count: churnedCount,
      rate: totalActive > 0 ? Math.round((churnedCount / (totalActive + churnedCount)) * 10000) / 100 : 0,
    },
    revenueByPeriod,
  }

  await logAdminAction(adminId, 'admin.financial_report', 'subscription', null, { period, startDate: startDate.toISOString(), endDate: endDate.toISOString() }, req)

  return NextResponse.json(report)
}

interface RevenueEntry {
  total: number
  taxAmount: number
  currency: string
  paidAt: Date | null
}

function groupRevenueByPeriod(
  entries: RevenueEntry[],
  period: 'week' | 'month' | 'quarter' | 'year'
): Array<{ label: string; revenue: number; count: number }> {
  const grouped = new Map<string, { revenue: number; count: number }>()

  for (const entry of entries) {
    if (!entry.paidAt) continue

    const date = new Date(entry.paidAt)
    let label: string

    switch (period) {
      case 'week':
        label = date.toISOString().split('T')[0] // Daily grouping for weekly
        break
      case 'month':
        label = date.toISOString().split('T')[0] // Daily grouping for monthly
        break
      case 'quarter':
        label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // Monthly grouping
        break
      case 'year':
        label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // Monthly grouping
        break
    }

    const existing = grouped.get(label) || { revenue: 0, count: 0 }
    existing.revenue += entry.total
    existing.count += 1
    grouped.set(label, existing)
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({
      label,
      revenue: Math.round(data.revenue * 100) / 100,
      count: data.count,
    }))
}
