import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────

interface ContactStats {
  total: number
  newThisPeriod: number
  bySource: { source: string; count: number }[]
  byLifecycle: { lifecycle: string; count: number }[]
  byStatus: { status: string; count: number }[]
  averageScore: number
}

interface PipelineStats {
  totalValue: number
  dealsCount: number
  byStage: { stageId: string; stageName: string; count: number; value: number }[]
  winRate: number
  avgCloseDays: number
  wonValue: number
  lostValue: number
  openValue: number
}

interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  openRate: number
  clickRate: number
  bounceRate: number
  byStatus: { status: string; count: number }[]
  overTime: { date: string; sent: number; opened: number; clicked: number }[]
}

interface ResponseTimeStats {
  avgFirstResponseMinutes: number
  medianFirstResponseMinutes: number
  byPeriod: { date: string; avgMinutes: number }[]
}

interface AgentPerformance {
  agentId: string
  agentName: string | null
  dealsWon: number
  dealsLost: number
  totalPipelineValue: number
  wonValue: number
  avgCloseDays: number
  contactsManaged: number
  winRate: number
}

interface RevenueForecast {
  pipelineId: string
  pipelineName: string
  stages: { stageId: string; stageName: string; probability: number; totalValue: number; weightedValue: number }[]
  totalWeighted: number
  totalUnweighted: number
}

interface DashboardOverview {
  totalContacts: number
  activeDeals: number
  pipelineValue: number
  winRate: number
  avgResponseTime: number
  contactGrowth: number
  dealGrowth: number
  recentContacts: { id: string; firstName: string | null; lastName: string; email: string | null; lifecycle: string; createdAt: Date }[]
  topDeals: { id: string; title: string; value: number; status: string; stageId: string; probability: number }[]
}

// ─── Helper ───────────────────────────────────────────────────────────────

function getPeriodStart(period: string): Date {
  const now = new Date()
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '30d':
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

// ─── Contact Stats ────────────────────────────────────────────────────────

export async function getContactStats(userId: string, period: string): Promise<ContactStats> {
  const periodStart = getPeriodStart(period)

  const [total, newThisPeriod, bySourceRaw, byLifecycleRaw, byStatusRaw, scoreResult] = await Promise.all([
    db.crmContact.count({ where: { userId } }),
    db.crmContact.count({ where: { userId, createdAt: { gte: periodStart } } }),
    db.crmContact.groupBy({ by: ['source'], where: { userId }, _count: { source: true } }),
    db.crmContact.groupBy({ by: ['lifecycle'], where: { userId }, _count: { lifecycle: true } }),
    db.crmContact.groupBy({ by: ['status'], where: { userId }, _count: { status: true } }),
    db.crmContact.aggregate({ where: { userId }, _avg: { score: true } }),
  ])

  return {
    total,
    newThisPeriod,
    bySource: bySourceRaw.map(r => ({ source: r.source || 'unknown', count: r._count.source })),
    byLifecycle: byLifecycleRaw.map(r => ({ lifecycle: r.lifecycle || 'unknown', count: r._count.lifecycle })),
    byStatus: byStatusRaw.map(r => ({ status: r.status || 'unknown', count: r._count.status })),
    averageScore: scoreResult._avg.score ?? 0,
  }
}

// ─── Pipeline Stats ───────────────────────────────────────────────────────

export async function getPipelineStats(userId: string, period: string): Promise<PipelineStats> {
  const deals = await db.deal.findMany({
    where: { userId },
    include: { pipeline: { select: { id: true, name: true, stages: true } } },
  })

  let totalValue = 0
  let wonValue = 0
  let lostValue = 0
  let openValue = 0
  const stageMap = new Map<string, { stageId: string; stageName: string; count: number; value: number }>()
  let wonCount = 0
  let totalClosed = 0
  let totalCloseDays = 0

  for (const deal of deals) {
    totalValue += deal.value

    // Build stage name map from pipeline.stages JSON
    const stages = (typeof deal.pipeline.stages === 'string' ? JSON.parse(deal.pipeline.stages) : []) as { id: string; name: string; probability: number }[]
    const stageInfo = stages.find(s => s.id === deal.stageId)
    const stageName = stageInfo?.name || deal.stageId

    if (!stageMap.has(deal.stageId)) {
      stageMap.set(deal.stageId, { stageId: deal.stageId, stageName, count: 0, value: 0 })
    }
    const entry = stageMap.get(deal.stageId)!
    entry.count++
    entry.value += deal.value

    if (deal.status === 'won') {
      wonValue += deal.value
      wonCount++
      totalClosed++
      if (deal.actualCloseDate && deal.createdAt) {
        totalCloseDays += Math.ceil((new Date(deal.actualCloseDate).getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }
    } else if (deal.status === 'lost') {
      lostValue += deal.value
      totalClosed++
    } else {
      openValue += deal.value
    }
  }

  return {
    totalValue,
    dealsCount: deals.length,
    byStage: Array.from(stageMap.values()),
    winRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
    avgCloseDays: totalClosed > 0 ? Math.round(totalCloseDays / totalClosed) : 0,
    wonValue,
    lostValue,
    openValue,
  }
}

// ─── Campaign Stats ───────────────────────────────────────────────────────

export async function getCampaignStats(userId: string, period: string): Promise<CampaignStats> {
  const periodStart = getPeriodStart(period)

  const campaigns = await db.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  let totalSent = 0
  let totalOpened = 0
  let totalClicked = 0
  let totalBounced = 0
  let activeCampaigns = 0
  const byStatusMap = new Map<string, number>()
  const overTimeMap = new Map<string, { sent: number; opened: number; clicked: number }>()

  for (const c of campaigns) {
    const stats = typeof c.stats === 'string' ? JSON.parse(c.stats) : {}
    const sent = Number(stats.sent || 0)
    const opened = Number(stats.opened || 0)
    const clicked = Number(stats.clicked || 0)
    const bounced = Number(stats.bounced || 0)

    totalSent += sent
    totalOpened += opened
    totalClicked += clicked
    totalBounced += bounced

    if (c.status === 'sending' || c.status === 'scheduled') activeCampaigns++

    byStatusMap.set(c.status, (byStatusMap.get(c.status) || 0) + 1)

    // Aggregate by date for time series
    const dateKey = new Date(c.createdAt).toISOString().split('T')[0]
    const existing = overTimeMap.get(dateKey) || { sent: 0, opened: 0, clicked: 0 }
    existing.sent += sent
    existing.opened += opened
    existing.clicked += clicked
    overTimeMap.set(dateKey, existing)
  }

  const overTime = Array.from(overTimeMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns,
    totalSent,
    totalOpened,
    totalClicked,
    totalBounced,
    openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
    clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
    bounceRate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0,
    byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count })),
    overTime,
  }
}

// ─── Response Time Stats ──────────────────────────────────────────────────

export async function getResponseTimeStats(userId: string): Promise<ResponseTimeStats> {
  // Use ActivityTimeline entries of type "email_sent" after "email_received" as proxy
  const activities = await db.activityTimeline.findMany({
    where: {
      contact: { userId },
      type: { in: ['email_received', 'email_sent'] },
    },
    orderBy: { createdAt: 'asc' },
    select: { type: true, createdAt: true, contactId: true },
  })

  const responseTimes: number[] = []
  const lastReceived = new Map<string, Date>()

  for (const a of activities) {
    if (a.type === 'email_received') {
      lastReceived.set(a.contactId, new Date(a.createdAt))
    } else if (a.type === 'email_sent') {
      const received = lastReceived.get(a.contactId)
      if (received) {
        const diffMin = (new Date(a.createdAt).getTime() - received.getTime()) / 60000
        if (diffMin >= 0 && diffMin < 10080) { // max 7 days
          responseTimes.push(diffMin)
          lastReceived.delete(a.contactId)
        }
      }
    }
  }

  const avgFirstResponseMinutes = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0

  const sorted = [...responseTimes].sort((a, b) => a - b)
  const medianFirstResponseMinutes = sorted.length > 0
    ? Math.round(sorted[Math.floor(sorted.length / 2)])
    : 0

  // By period (last 30 days grouped by day)
  const byPeriod: { date: string; avgMinutes: number }[] = []

  return {
    avgFirstResponseMinutes,
    medianFirstResponseMinutes,
    byPeriod,
  }
}

// ─── Agent Performance ────────────────────────────────────────────────────

export async function getAgentPerformance(userId: string): Promise<AgentPerformance[]> {
  // Get all deals for this user and group by assignedToId
  const deals = await db.deal.findMany({
    where: { userId },
    select: {
      assignedToId: true,
      assignedTo: { select: { name: true } },
      status: true,
      value: true,
      actualCloseDate: true,
      createdAt: true,
    },
  })

  // Also count contacts managed per agent
  const contacts = await db.crmContact.findMany({
    where: { userId },
    select: { id: true },
  })

  const agentMap = new Map<string, AgentPerformance>()

  // Initialize the main user as an agent
  agentMap.set(userId, {
    agentId: userId,
    agentName: 'Vous',
    dealsWon: 0,
    dealsLost: 0,
    totalPipelineValue: 0,
    wonValue: 0,
    avgCloseDays: 0,
    contactsManaged: contacts.length,
    winRate: 0,
  })

  let totalCloseDays = 0
  let closeDayCount = 0

  for (const deal of deals) {
    const agentId = deal.assignedToId || userId
    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, {
        agentId,
        agentName: deal.assignedTo?.name || 'Non assigné',
        dealsWon: 0,
        dealsLost: 0,
        totalPipelineValue: 0,
        wonValue: 0,
        avgCloseDays: 0,
        contactsManaged: 0,
        winRate: 0,
      })
    }

    const agent = agentMap.get(agentId)!
    agent.totalPipelineValue += deal.value

    if (deal.status === 'won') {
      agent.dealsWon++
      agent.wonValue += deal.value
      if (deal.actualCloseDate && deal.createdAt) {
        totalCloseDays += Math.ceil((new Date(deal.actualCloseDate).getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        closeDayCount++
      }
    } else if (deal.status === 'lost') {
      agent.dealsLost++
    }
  }

  for (const agent of agentMap.values()) {
    const total = agent.dealsWon + agent.dealsLost
    agent.winRate = total > 0 ? Math.round((agent.dealsWon / total) * 100) : 0
  }

  // Set avg close days on the main user
  const mainAgent = agentMap.get(userId)!
  mainAgent.avgCloseDays = closeDayCount > 0 ? Math.round(totalCloseDays / closeDayCount) : 0

  return Array.from(agentMap.values())
}

// ─── Compute & Cache ──────────────────────────────────────────────────────

export async function computeAndCacheMetrics(userId: string, type: string, period: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let data: Record<string, unknown> = {}

  switch (type) {
    case 'crm_contacts':
      data = await getContactStats(userId, period)
      break
    case 'pipeline_value':
      data = await getPipelineStats(userId, period)
      break
    case 'campaign_stats':
      data = await getCampaignStats(userId, period)
      break
    case 'response_time':
      data = await getResponseTimeStats(userId)
      break
    case 'agent_performance':
      data = await getAgentPerformance(userId)
      break
  }

  await db.metricSnapshot.upsert({
    where: {
      userId_type_period_date: {
        userId,
        type,
        period,
        date: today,
      },
    },
    create: {
      userId,
      type,
      period,
      date: today,
      data: JSON.stringify(data),
    },
    update: {
      data: JSON.stringify(data),
      computedAt: new Date(),
    },
  })
}

// ─── Revenue Forecast ─────────────────────────────────────────────────────

export async function getRevenueForecast(pipelineId?: string): Promise<RevenueForecast[]> {
  const where = pipelineId ? { id: pipelineId } : {}
  const pipelines = await db.pipeline.findMany({
    where,
    include: { deals: true },
  })

  return pipelines.map(pipeline => {
    const stages = (typeof pipeline.stages === 'string' ? JSON.parse(pipeline.stages) : []) as { id: string; name: string; probability: number }[]
    const stageMap = new Map<string, { stageId: string; stageName: string; probability: number; totalValue: number; weightedValue: number }>()

    for (const stage of stages) {
      stageMap.set(stage.id, {
        stageId: stage.id,
        stageName: stage.name,
        probability: stage.probability || 0,
        totalValue: 0,
        weightedValue: 0,
      })
    }

    let totalWeighted = 0
    let totalUnweighted = 0

    for (const deal of pipeline.deals) {
      if (deal.status !== 'open') continue
      const stageInfo = stageMap.get(deal.stageId)
      const probability = stageInfo?.probability ?? deal.probability ?? 0
      const weighted = deal.value * (probability / 100)

      if (stageInfo) {
        stageInfo.totalValue += deal.value
        stageInfo.weightedValue += weighted
      } else {
        // Stage not in JSON, create entry
        stageMap.set(deal.stageId, {
          stageId: deal.stageId,
          stageName: deal.stageId,
          probability,
          totalValue: deal.value,
          weightedValue: weighted,
        })
      }

      totalWeighted += weighted
      totalUnweighted += deal.value
    }

    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stages: Array.from(stageMap.values()),
      totalWeighted: Math.round(totalWeighted * 100) / 100,
      totalUnweighted: Math.round(totalUnweighted * 100) / 100,
    }
  })
}

// ─── Dashboard Overview ───────────────────────────────────────────────────

export async function getDashboardOverview(userId: string): Promise<DashboardOverview> {
  const periodStart = getPeriodStart('30d')
  const prevPeriodStart = getPeriodStart('60d')

  const [
    totalContacts,
    newContacts,
    prevNewContacts,
    activeDeals,
    pipelineValue,
    wonDeals,
    totalClosedDeals,
    recentContacts,
    topDeals,
    responseTimeStats,
  ] = await Promise.all([
    db.crmContact.count({ where: { userId } }),
    db.crmContact.count({ where: { userId, createdAt: { gte: periodStart } } }),
    db.crmContact.count({ where: { userId, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    db.deal.count({ where: { userId, status: 'open' } }),
    db.deal.aggregate({ where: { userId, status: 'open' }, _sum: { value: true } }),
    db.deal.count({ where: { userId, status: 'won' } }),
    db.deal.count({ where: { userId, status: { in: ['won', 'lost'] } } }),
    db.crmContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, lifecycle: true, createdAt: true },
    }),
    db.deal.findMany({
      where: { userId, status: 'open' },
      orderBy: { value: 'desc' },
      take: 5,
      select: { id: true, title: true, value: true, status: true, stageId: true, probability: true },
    }),
    getResponseTimeStats(userId),
  ])

  const contactGrowth = prevNewContacts > 0
    ? Math.round(((newContacts - prevNewContacts) / prevNewContacts) * 100)
    : newContacts > 0 ? 100 : 0

  return {
    totalContacts,
    activeDeals,
    pipelineValue: pipelineValue._sum.value ?? 0,
    winRate: totalClosedDeals > 0 ? Math.round((wonDeals / totalClosedDeals) * 100) : 0,
    avgResponseTime: responseTimeStats.avgFirstResponseMinutes,
    contactGrowth,
    dealGrowth: 0,
    recentContacts,
    topDeals,
  }
}
