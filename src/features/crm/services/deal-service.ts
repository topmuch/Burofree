import { db } from '@/lib/db'
import type { PipelineCreateInput, PipelineUpdateInput, DealCreateInput, DealUpdateInput, DealQueryInput, PipelineStageInput } from '@/lib/validations/crm'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  total: number
}

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  probability: number
}

// ─── Pipeline CRUD ──────────────────────────────────────────────────────────

export async function getPipelines(userId: string, teamId?: string) {
  const where: any = { userId }
  if (teamId) where.teamId = teamId

  return db.pipeline.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { deals: true } },
    },
  })
}

export async function getPipeline(id: string, userId: string) {
  return db.pipeline.findFirst({
    where: { id, userId },
    include: {
      deals: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, company: true, avatar: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createPipeline(userId: string, data: PipelineCreateInput) {
  // If this is set as default, unset any existing default
  if (data.isDefault) {
    await db.pipeline.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    })
  }

  // Ensure at least one stage exists
  let stages = data.stages
  try {
    const parsed = JSON.parse(stages) as PipelineStage[]
    if (!parsed.length) {
      stages = JSON.stringify([
        { id: 's1', name: 'Qualification', order: 1, color: '#3b82f6', probability: 10 },
        { id: 's2', name: 'Proposition', order: 2, color: '#f59e0b', probability: 40 },
        { id: 's3', name: 'Négociation', order: 3, color: '#8b5cf6', probability: 70 },
        { id: 's4', name: 'Conclusion', order: 4, color: '#10b981', probability: 90 },
      ])
    }
  } catch {
    stages = JSON.stringify([
      { id: 's1', name: 'Qualification', order: 1, color: '#3b82f6', probability: 10 },
      { id: 's2', name: 'Proposition', order: 2, color: '#f59e0b', probability: 40 },
      { id: 's3', name: 'Négociation', order: 3, color: '#8b5cf6', probability: 70 },
      { id: 's4', name: 'Conclusion', order: 4, color: '#10b981', probability: 90 },
    ])
  }

  return db.pipeline.create({
    data: {
      name: data.name,
      description: data.description,
      stages,
      isDefault: data.isDefault,
      teamId: data.teamId || null,
      userId,
    },
  })
}

export async function updatePipeline(id: string, userId: string, data: PipelineUpdateInput) {
  const existing = await db.pipeline.findFirst({ where: { id, userId } })
  if (!existing) throw new Error('Pipeline non trouvé')

  // If setting as default, unset existing
  if (data.isDefault) {
    await db.pipeline.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    })
  }

  return db.pipeline.update({
    where: { id },
    data,
  })
}

export async function deletePipeline(id: string, userId: string) {
  const existing = await db.pipeline.findFirst({
    where: { id, userId },
    include: { _count: { select: { deals: true } } },
  })
  if (!existing) throw new Error('Pipeline non trouvé')
  if (existing._count.deals > 0) {
    throw new Error('Impossible de supprimer un pipeline contenant des affaires')
  }

  await db.pipeline.delete({ where: { id } })
  return { success: true }
}

export async function updatePipelineStages(
  pipelineId: string,
  userId: string,
  stages: PipelineStageInput[],
) {
  const existing = await db.pipeline.findFirst({ where: { id: pipelineId, userId } })
  if (!existing) throw new Error('Pipeline non trouvé')

  // Validate stage IDs exist for deals
  const currentStages = JSON.parse(existing.stages) as PipelineStage[]
  const currentStageIds = new Set(currentStages.map(s => s.id))
  const newStageIds = new Set(stages.map(s => s.id))

  // Check for orphaned deals
  const removedStageIds = [...currentStageIds].filter(id => !newStageIds.has(id))
  if (removedStageIds.length > 0) {
    const orphanedDeals = await db.deal.count({
      where: { pipelineId, stageId: { in: removedStageIds } },
    })
    if (orphanedDeals > 0) {
      throw new Error(
        `Impossible de supprimer les étapes avec des affaires existantes (${orphanedDeals} affaires orphelines)`,
      )
    }
  }

  return db.pipeline.update({
    where: { id: pipelineId },
    data: { stages: JSON.stringify(stages) },
  })
}

// ─── Deal CRUD ──────────────────────────────────────────────────────────────

export async function getDeals(
  userId: string,
  filters: DealQueryInput,
): Promise<PaginatedResult<any>> {
  const {
    pipelineId, stageId, status, contactId, assignedToId,
    teamId, minValue, maxValue, cursor, limit, sort, order,
  } = filters

  const where: any = { userId }
  if (pipelineId) where.pipelineId = pipelineId
  if (stageId) where.stageId = stageId
  if (status) where.status = status
  if (contactId) where.contactId = contactId
  if (assignedToId) where.assignedToId = assignedToId
  if (teamId) where.teamId = teamId
  if (minValue !== undefined || maxValue !== undefined) {
    where.value = {}
    if (minValue !== undefined) where.value.gte = minValue
    if (maxValue !== undefined) where.value.lte = maxValue
  }
  if (cursor) where.id = { lt: cursor }

  const orderBy: any = {}
  orderBy[sort] = order

  const [data, total] = await Promise.all([
    db.deal.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        pipeline: { select: { id: true, name: true, stages: true } },
        contact: { select: { id: true, firstName: true, lastName: true, company: true, avatar: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        _count: { select: { activities: true } },
      },
    }),
    db.deal.count({ where: cursor ? { userId } : where }),
  ])

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, -1) : data
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

  return { data: items, nextCursor, total }
}

export async function getDeal(id: string, userId: string) {
  return db.deal.findFirst({
    where: { id, userId },
    include: {
      pipeline: { select: { id: true, name: true, stages: true } },
      contact: { select: { id: true, firstName: true, lastName: true, company: true, email: true, phone: true, avatar: true } },
      assignedTo: { select: { id: true, name: true, avatar: true } },
      activities: { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  })
}

export async function createDeal(userId: string, data: DealCreateInput) {
  // Verify pipeline exists and belongs to user
  const pipeline = await db.pipeline.findFirst({
    where: { id: data.pipelineId, userId },
  })
  if (!pipeline) throw new Error('Pipeline non trouvé')

  // Validate stageId belongs to pipeline
  const stages = JSON.parse(pipeline.stages) as PipelineStage[]
  const stage = stages.find(s => s.id === data.stageId)
  if (!stage) throw new Error('Étape non trouvée dans ce pipeline')

  // Auto-set probability from stage if not explicitly set
  const probability = data.probability || stage.probability

  const deal = await db.deal.create({
    data: {
      pipelineId: data.pipelineId,
      stageId: data.stageId,
      title: data.title,
      description: data.description || null,
      value: data.value,
      currency: data.currency,
      probability,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      contactId: data.contactId || null,
      assignedToId: data.assignedToId || null,
      teamId: data.teamId || null,
      userId,
    },
    include: {
      pipeline: { select: { id: true, name: true, stages: true } },
      contact: { select: { id: true, firstName: true, lastName: true, company: true, avatar: true } },
    },
  })

  // Log deal creation
  await db.dealActivity.create({
    data: {
      dealId: deal.id,
      type: 'created',
      note: `Affaire créée dans l'étape "${stage.name}"`,
      metadata: JSON.stringify({ stageId: data.stageId, stageName: stage.name, value: data.value }),
      userId,
    },
  })

  // Log on contact
  if (data.contactId) {
    await db.activityTimeline.create({
      data: {
        contactId: data.contactId,
        type: 'deal_created',
        title: `Affaire créée: ${data.title}`,
        metadata: JSON.stringify({ dealId: deal.id, value: data.value }),
        userId,
      },
    }).catch(() => {})
  }

  return deal
}

export async function updateDealStage(
  dealId: string,
  userId: string,
  newStageId: string,
) {
  const deal = await db.deal.findFirst({
    where: { id: dealId, userId },
    include: { pipeline: true },
  })
  if (!deal) throw new Error('Affaire non trouvée')

  const stages = JSON.parse(deal.pipeline.stages) as PipelineStage[]
  const oldStage = stages.find(s => s.id === deal.stageId)
  const newStage = stages.find(s => s.id === newStageId)
  if (!newStage) throw new Error('Nouvelle étape non trouvée')

  const updated = await db.deal.update({
    where: { id: dealId },
    data: {
      stageId: newStageId,
      probability: newStage.probability,
    },
  })

  // Log stage change
  await db.dealActivity.create({
    data: {
      dealId,
      type: 'stage_changed',
      note: `${oldStage?.name || 'Inconnu'} → ${newStage.name}`,
      metadata: JSON.stringify({
        oldStageId: deal.stageId,
        oldStageName: oldStage?.name,
        newStageId,
        newStageName: newStage.name,
      }),
      userId,
    },
  })

  return updated
}

export async function updateDeal(id: string, userId: string, data: DealUpdateInput) {
  const deal = await db.deal.findFirst({ where: { id, userId } })
  if (!deal) throw new Error('Affaire non trouvée')

  const updateData: any = { ...data }
  if (data.expectedCloseDate) updateData.expectedCloseDate = new Date(data.expectedCloseDate)
  if (data.actualCloseDate) updateData.actualCloseDate = new Date(data.actualCloseDate)

  // Track value change
  if (data.value !== undefined && data.value !== deal.value) {
    await db.dealActivity.create({
      data: {
        dealId: id,
        type: 'value_updated',
        note: `Valeur: ${deal.value} → ${data.value}`,
        metadata: JSON.stringify({ oldValue: deal.value, newValue: data.value }),
        userId,
      },
    })
  }

  // Track status change
  if (data.status && data.status !== deal.status) {
    await db.dealActivity.create({
      data: {
        dealId: id,
        type: 'status_changed',
        note: `Statut: ${deal.status} → ${data.status}`,
        metadata: JSON.stringify({ oldStatus: deal.status, newStatus: data.status, lossReason: data.lossReason }),
        userId,
      },
    })
  }

  return db.deal.update({
    where: { id },
    data: updateData,
    include: {
      pipeline: { select: { id: true, name: true, stages: true } },
      contact: { select: { id: true, firstName: true, lastName: true, company: true, avatar: true } },
      assignedTo: { select: { id: true, name: true, avatar: true } },
    },
  })
}

export async function deleteDeal(id: string, userId: string) {
  const deal = await db.deal.findFirst({ where: { id, userId } })
  if (!deal) throw new Error('Affaire non trouvée')

  await db.deal.delete({ where: { id } })
  return { success: true }
}

// ─── Pipeline Stats ─────────────────────────────────────────────────────────

export async function getPipelineStats(pipelineId: string, userId: string) {
  const pipeline = await db.pipeline.findFirst({ where: { id: pipelineId, userId } })
  if (!pipeline) throw new Error('Pipeline non trouvé')

  const stages = JSON.parse(pipeline.stages) as PipelineStage[]

  const deals = await db.deal.findMany({
    where: { pipelineId, status: 'open' },
    select: { stageId: true, value: true, probability: true },
  })

  const stageStats = stages.map(stage => {
    const stageDeals = deals.filter(d => d.stageId === stage.id)
    const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0)
    const weightedValue = stageDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0)
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      probability: stage.probability,
      dealCount: stageDeals.length,
      totalValue,
      weightedValue,
    }
  })

  const totalPipelineValue = deals.reduce((sum, d) => sum + d.value, 0)
  const totalWeightedValue = deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0)

  return {
    pipelineId,
    pipelineName: pipeline.name,
    stages: stageStats,
    totalDeals: deals.length,
    totalPipelineValue,
    totalWeightedValue,
  }
}
