/**
 * Platform Metrics — Aggregation queries for the Superadmin Dashboard.
 * Uses Prisma aggregation and raw queries for KPI computation.
 * Results are cached via a simple in-memory cache (5 min TTL).
 */

import { db } from '@/lib/db'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const metricsCache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = metricsCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    metricsCache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  metricsCache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export interface PlatformKPIs {
  totalUsers: number
  activeUsers30d: number
  newUsersThisMonth: number
  mrr: number
  arr: number
  churnRate: number
  openTickets: number
  dbSizeMB: number
  activeSubscriptions: number
  trialSubscriptions: number
  pastDueSubscriptions: number
  totalRevenue: number
  monthlyRevenue: Array<{ month: string; revenue: number; newUsers: number }>
  moduleUsage: Array<{ module: string; activeUsers: number; revenue: number }>
  recentErrors: Array<{ timestamp: string; message: string; count: number }>
  systemHealth: {
    db: 'healthy' | 'degraded' | 'down'
    redis: 'healthy' | 'degraded' | 'down'
    storage: 'healthy' | 'degraded' | 'down'
  }
}

/**
 * Get platform-wide KPIs with 5-min cache.
 */
export async function getPlatformKPIs(): Promise<PlatformKPIs> {
  const cached = getCached<PlatformKPIs>('platform_kpis')
  if (cached) return cached

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Total users
  const totalUsers = await db.user.count()

  // Active users (logged in within 30 days — approximate via sessions)
  const activeUsers30d = await db.session.count({
    where: { expires: { gte: thirtyDaysAgo } },
  })

  // New users this month
  const newUsersThisMonth = await db.user.count({
    where: { createdAt: { gte: startOfMonth } },
  })

  // Subscriptions
  const [activeSubscriptions, trialSubscriptions, pastDueSubscriptions] = await Promise.all([
    db.subscription.count({ where: { status: 'active' } }),
    db.subscription.count({ where: { status: 'trialing' } }),
    db.subscription.count({ where: { status: 'past_due' } }),
  ])

  // Revenue aggregation
  const paidInvoices = await db.invoice.findMany({
    where: { status: 'paid', paidAt: { gte: startOfMonth } },
    select: { total: true },
  })
  const monthlyRevenueNow = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)

  const allPaidInvoices = await db.invoice.findMany({
    where: { status: 'paid' },
    select: { total: true },
  })
  const totalRevenue = allPaidInvoices.reduce((sum, inv) => sum + inv.total, 0)

  // MRR approximation from active subscriptions (using invoice totals as proxy)
  const mrr = monthlyRevenueNow
  const arr = mrr * 12

  // Churn rate: users who cancelled this month / total active last month
  const cancelledThisMonth = await db.subscription.count({
    where: {
      status: 'canceled',
      canceledAt: { gte: startOfMonth },
    },
  })
  const churnRate = activeSubscriptions > 0
    ? (cancelledThisMonth / (activeSubscriptions + cancelledThisMonth)) * 100
    : 0

  // Open support tickets
  const openTickets = await db.supportTicket.count({
    where: { status: { in: ['open', 'in_progress', 'waiting_user'] } },
  })

  // Monthly revenue chart (last 12 months)
  const monthlyRevenue = await getMonthlyRevenueChart()

  // Module usage
  const moduleUsage = await getModuleUsage()

  // Recent errors (from webhook events that failed)
  const recentErrors = await db.webhookEvent.findMany({
    where: { processed: false, error: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { createdAt: true, error: true, eventType: true },
  })

  const kpIs: PlatformKPIs = {
    totalUsers,
    activeUsers30d,
    newUsersThisMonth,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100,
    openTickets,
    dbSizeMB: 0, // Computed separately
    activeSubscriptions,
    trialSubscriptions,
    pastDueSubscriptions,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    monthlyRevenue,
    moduleUsage,
    recentErrors: recentErrors.map(e => ({
      timestamp: e.createdAt.toISOString(),
      message: e.error || 'Unknown error',
      count: 1,
    })),
    systemHealth: {
      db: 'healthy' as const,
      redis: 'healthy' as const,
      storage: 'healthy' as const,
    },
  }

  setCache('platform_kpis', kpIs)
  return kpIs
}

async function getMonthlyRevenueChart(): Promise<Array<{ month: string; revenue: number; newUsers: number }>> {
  const months: Array<{ month: string; revenue: number; newUsers: number }> = []
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthLabel = start.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })

    const [invoices, users] = await Promise.all([
      db.invoice.findMany({
        where: { status: 'paid', paidAt: { gte: start, lte: end } },
        select: { total: true },
      }),
      db.user.count({ where: { createdAt: { gte: start, lte: end } } }),
    ])

    months.push({
      month: monthLabel,
      revenue: invoices.reduce((s, inv) => s + inv.total, 0),
      newUsers: users,
    })
  }

  return months
}

async function getModuleUsage(): Promise<Array<{ module: string; activeUsers: number; revenue: number }>> {
  const modules = await db.module.findMany({
    where: { isActive: true },
    select: {
      name: true,
      price: true,
      _count: { select: { userModules: { where: { status: 'active' } } } },
    },
  })

  return modules.map(m => ({
    module: m.name,
    activeUsers: m._count.userModules,
    revenue: m.price * m._count.userModules,
  }))
}

/**
 * Clear the metrics cache (e.g., after config changes).
 */
export function clearMetricsCache(): void {
  metricsCache.clear()
}

/**
 * Get system health status by checking DB connectivity.
 */
export async function getSystemHealth(): Promise<{
  db: 'healthy' | 'degraded' | 'down'
  latency: number
}> {
  const start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    return {
      db: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'down',
      latency,
    }
  } catch {
    return { db: 'down', latency: Date.now() - start }
  }
}
