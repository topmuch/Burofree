import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { analyticsRangeSchema } from '@/lib/validations/productivity'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/overview
 *
 * Aggregated analytics dashboard data.
 * Query params:
 *   - range: week | month | year  (default: month)
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    // Validate range param
    const { searchParams } = new URL(req.url)
    const rangeParse = analyticsRangeSchema.safeParse(searchParams.get('range') || undefined)
    if (!rangeParse.success) {
      return NextResponse.json(
        { error: 'Paramètre "range" invalide. Valeurs acceptées : week, month, year' },
        { status: 400 }
      )
    }
    const range = rangeParse.data

    // ─── Compute date range ────────────────────────────────────────────────────
    const now = new Date()
    let rangeStart: Date
    let rangeEnd: Date

    switch (range) {
      case 'week': {
        rangeStart = new Date(now)
        rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay() + 1) // Monday
        rangeStart.setHours(0, 0, 0, 0)
        rangeEnd = new Date(rangeStart)
        rangeEnd.setDate(rangeEnd.getDate() + 7)
        break
      }
      case 'year': {
        rangeStart = new Date(now.getFullYear(), 0, 1)
        rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      }
      default: { // month
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      }
    }

    // ─── Parallel data fetching ────────────────────────────────────────────────
    const [
      timeEntries,
      paidInvoices,
      allInvoices,
      forecastInvoices,
      tasks,
      todayEntries,
      weekEntries,
      projects,
    ] = await Promise.all([
      // Time entries in the range
      db.timeEntry.findMany({
        where: {
          userId: user.id,
          startTime: { gte: rangeStart, lte: rangeEnd },
          duration: { not: null },
        },
        include: { project: true },
      }),

      // Paid invoices in the range (revenue)
      db.invoice.findMany({
        where: {
          userId: user.id,
          status: 'paid',
          paidAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { total: true, clientName: true, projectId: true, paidAt: true },
      }),

      // All invoices in the range (for conversion rate)
      db.invoice.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { status: true, total: true },
      }),

      // Forecast: sent + draft invoices in the range
      db.invoice.findMany({
        where: {
          userId: user.id,
          status: { in: ['sent', 'draft'] },
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { total: true },
      }),

      // Tasks for completion rate
      db.task.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { status: true },
      }),

      // Time entries today (for workload)
      db.timeEntry.findMany({
        where: {
          userId: user.id,
          startTime: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
          duration: { not: null },
        },
        select: { duration: true },
      }),

      // Time entries this week (for workload)
      db.timeEntry.findMany({
        where: {
          userId: user.id,
          startTime: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 8),
          },
          duration: { not: null },
        },
        select: { duration: true, startTime: true },
      }),

      // Active projects with time entries for breakdown
      db.project.findMany({
        where: {
          userId: user.id,
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          color: true,
          clientName: true,
        },
      }),
    ])

    // ─── Hours worked ──────────────────────────────────────────────────────────
    const totalDuration = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0)
    const hoursWorked = Math.round((totalDuration / 3600) * 100) / 100

    const billableDuration = timeEntries
      .filter(e => e.isBillable)
      .reduce((sum, e) => sum + (e.duration || 0), 0)
    const hoursBillable = Math.round((billableDuration / 3600) * 100) / 100

    // ─── Revenue ───────────────────────────────────────────────────────────────
    const revenue = Math.round(paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0) * 100) / 100
    const revenueForecast = Math.round(forecastInvoices.reduce((sum, i) => sum + (i.total || 0), 0) * 100) / 100

    // ─── Conversion rate ───────────────────────────────────────────────────────
    const totalInvoices = allInvoices.length
    const paidCount = allInvoices.filter(i => i.status === 'paid').length
    const conversionRate = totalInvoices > 0
      ? Math.round((paidCount / totalInvoices) * 10000) / 100 // e.g. 66.67
      : 0

    // ─── Time by project ───────────────────────────────────────────────────────
    const projectTimeMap = new Map<string, {
      projectName: string
      projectColor: string
      totalDuration: number
      billableDuration: number
      invoiceRevenue: number
    }>()

    // Initialize with all active projects
    for (const p of projects) {
      projectTimeMap.set(p.id, {
        projectName: p.name,
        projectColor: p.color,
        totalDuration: 0,
        billableDuration: 0,
        invoiceRevenue: 0,
      })
    }

    // Add the "no project" bucket
    projectTimeMap.set('_none', {
      projectName: 'Sans projet',
      projectColor: '#71717a',
      totalDuration: 0,
      billableDuration: 0,
      invoiceRevenue: 0,
    })

    // Accumulate time entries
    for (const entry of timeEntries) {
      const key = entry.projectId || '_none'
      const existing = projectTimeMap.get(key)
      if (existing) {
        existing.totalDuration += entry.duration || 0
        if (entry.isBillable) existing.billableDuration += entry.duration || 0
      }
    }

    // Accumulate invoice revenue per project
    for (const inv of paidInvoices) {
      const key = inv.projectId || '_none'
      const existing = projectTimeMap.get(key)
      if (existing) {
        existing.invoiceRevenue += inv.total || 0
      }
    }

    const timeByProject = Array.from(projectTimeMap.entries())
      .filter(([, data]) => data.totalDuration > 0 || data.invoiceRevenue > 0)
      .map(([id, data]) => ({
        projectId: id === '_none' ? null : id,
        projectName: data.projectName,
        projectColor: data.projectColor,
        totalHours: Math.round((data.totalDuration / 3600) * 100) / 100,
        billableHours: Math.round((data.billableDuration / 3600) * 100) / 100,
        revenue: Math.round(data.invoiceRevenue * 100) / 100,
      }))

    // ─── Completion rate ───────────────────────────────────────────────────────
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'done').length
    const completionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 10000) / 100
      : 0

    // ─── Workload ──────────────────────────────────────────────────────────────
    const todayHours = Math.round(
      (todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600) * 100
    ) / 100

    const thisWeekHours = Math.round(
      (weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600) * 100
    ) / 100

    // Tasks by day for the current week
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const tasksByDay: { day: string; count: number }[] = []
    for (let d = 1; d <= 7; d++) {
      // Monday=1 to Sunday=7
      const dayDate = new Date(now)
      dayDate.setDate(now.getDate() - now.getDay() + d)
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)

      const dayEntries = weekEntries.filter(e => {
        return e.startTime >= dayStart && e.startTime < dayEnd
      })
      const dayHours = dayEntries.reduce((sum, e) => sum + (e.duration || 0), 0)
      tasksByDay.push({
        day: dayNames[dayDate.getDay()],
        count: Math.round((dayHours / 3600) * 100) / 100,
      })
    }

    const workload = {
      today: todayHours,
      thisWeek: thisWeekHours,
      tasksByDay,
    }

    // ─── Monthly revenue (last 6 months) ───────────────────────────────────────
    const allPaidInvoices = await db.invoice.findMany({
      where: {
        userId: user.id,
        status: 'paid',
        paidAt: { not: null },
      },
      select: { total: true, paidAt: true },
    })

    const allForecastInvoices = await db.invoice.findMany({
      where: {
        userId: user.id,
        status: { in: ['sent', 'draft'] },
      },
      select: { total: true, createdAt: true },
    })

    const monthlyRevenue: { month: string; revenue: number; forecast: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

      const monthRev = allPaidInvoices
        .filter(inv => inv.paidAt && inv.paidAt >= mStart && inv.paidAt <= mEnd)
        .reduce((sum, inv) => sum + (inv.total || 0), 0)

      const monthForecast = allForecastInvoices
        .filter(inv => inv.createdAt >= mStart && inv.createdAt <= mEnd)
        .reduce((sum, inv) => sum + (inv.total || 0), 0)

      monthlyRevenue.push({
        month: mStart.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: Math.round(monthRev * 100) / 100,
        forecast: Math.round(monthForecast * 100) / 100,
      })
    }

    // ─── Top clients ───────────────────────────────────────────────────────────
    const clientMap = new Map<string, { revenue: number; projectCount: number }>()
    for (const inv of paidInvoices) {
      const clientName = inv.clientName || 'Client inconnu'
      const existing = clientMap.get(clientName) || { revenue: 0, projectCount: 0 }
      existing.revenue += inv.total || 0
      clientMap.set(clientName, existing)
    }

    // Also count projects per client
    for (const p of projects) {
      if (p.clientName) {
        const existing = clientMap.get(p.clientName) || { revenue: 0, projectCount: 0 }
        existing.projectCount += 1
        clientMap.set(p.clientName, existing)
      }
    }

    const topClients = Array.from(clientMap.entries())
      .map(([clientName, data]) => ({
        clientName,
        revenue: Math.round(data.revenue * 100) / 100,
        projectCount: data.projectCount,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // ─── Return response ───────────────────────────────────────────────────────
    return NextResponse.json({
      range,
      hoursWorked,
      hoursBillable,
      revenue,
      revenueForecast,
      conversionRate,
      timeByProject,
      completionRate,
      workload,
      monthlyRevenue,
      topClients,
    })
  } catch (error) {
    console.error('Analytics overview GET error:', error)
    return NextResponse.json(
      { error: 'Échec du chargement des données analytiques' },
      { status: 500 }
    )
  }
}
