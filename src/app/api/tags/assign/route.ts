import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { tagAssignSchema } from '@/lib/validations/productivity'

type EntityType = 'task' | 'email' | 'document' | 'project'

export async function POST(req: NextRequest) {
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

    // Validate body with Zod
    const body = await req.json()
    const parse = tagAssignSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parse.error.flatten() },
        { status: 400 }
      )
    }
    const { tagId, entityType, entityIds } = parse.data

    // Verify the tag belongs to the user
    const tag = await db.tag.findFirst({
      where: { id: tagId, userId: user.id },
    })
    if (!tag) {
      return NextResponse.json({ error: 'Tag non trouvé' }, { status: 404 })
    }

    // Verify entity ownership
    const ownedEntityIds = await verifyEntityOwnership(user.id, entityType, entityIds)
    if (ownedEntityIds.length === 0) {
      return NextResponse.json({ error: 'Aucune entité valide trouvée' }, { status: 404 })
    }

    let assigned = 0

    // Bulk assign with duplicate prevention
    // Note: skipDuplicates is not supported on SQLite, so we filter existing assignments manually
    switch (entityType) {
      case 'task': {
        const existing = await db.taskTag.findMany({ where: { tagId }, select: { taskId: true } })
        const existingIds = new Set(existing.map(e => e.taskId))
        const newData = ownedEntityIds.filter(id => !existingIds.has(id)).map((taskId) => ({ tagId, taskId }))
        if (newData.length > 0) { const result = await db.taskTag.createMany({ data: newData }); assigned = result.count }
        break
      }
      case 'email': {
        const existing = await db.emailTag.findMany({ where: { tagId }, select: { emailId: true } })
        const existingIds = new Set(existing.map(e => e.emailId))
        const newData = ownedEntityIds.filter(id => !existingIds.has(id)).map((emailId) => ({ tagId, emailId }))
        if (newData.length > 0) { const result = await db.emailTag.createMany({ data: newData }); assigned = result.count }
        break
      }
      case 'document': {
        const existing = await db.documentTag.findMany({ where: { tagId }, select: { documentId: true } })
        const existingIds = new Set(existing.map(e => e.documentId))
        const newData = ownedEntityIds.filter(id => !existingIds.has(id)).map((documentId) => ({ tagId, documentId }))
        if (newData.length > 0) { const result = await db.documentTag.createMany({ data: newData }); assigned = result.count }
        break
      }
      case 'project': {
        const existing = await db.projectTag.findMany({ where: { tagId }, select: { projectId: true } })
        const existingIds = new Set(existing.map(e => e.projectId))
        const newData = ownedEntityIds.filter(id => !existingIds.has(id)).map((projectId) => ({ tagId, projectId }))
        if (newData.length > 0) { const result = await db.projectTag.createMany({ data: newData }); assigned = result.count }
        break
      }
    }

    return NextResponse.json({ assigned })
  } catch (error) {
    console.error('Tags assign POST error:', error)
    return NextResponse.json({ error: 'Échec de l\'assignation des tags' }, { status: 500 })
  }
}

/**
 * Verify that entities belong to the authenticated user.
 * Returns only the IDs of entities the user owns.
 */
async function verifyEntityOwnership(
  userId: string,
  entityType: EntityType,
  entityIds: string[]
): Promise<string[]> {
  switch (entityType) {
    case 'task': {
      const owned = await db.task.findMany({
        where: { id: { in: entityIds }, userId },
        select: { id: true },
      })
      return owned.map(e => e.id)
    }
    case 'email': {
      const owned = await db.email.findMany({
        where: { id: { in: entityIds }, userId },
        select: { id: true },
      })
      return owned.map(e => e.id)
    }
    case 'document': {
      const owned = await db.document.findMany({
        where: { id: { in: entityIds }, userId },
        select: { id: true },
      })
      return owned.map(e => e.id)
    }
    case 'project': {
      const owned = await db.project.findMany({
        where: { id: { in: entityIds }, userId },
        select: { id: true },
      })
      return owned.map(e => e.id)
    }
  }
}
