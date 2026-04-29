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

    // Validate body with Zod (reuse tagAssignSchema since structure is the same)
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

    let unassigned = 0

    switch (entityType) {
      case 'task': {
        const result = await db.taskTag.deleteMany({
          where: { tagId, taskId: { in: entityIds } },
        })
        unassigned = result.count
        break
      }
      case 'email': {
        const result = await db.emailTag.deleteMany({
          where: { tagId, emailId: { in: entityIds } },
        })
        unassigned = result.count
        break
      }
      case 'document': {
        const result = await db.documentTag.deleteMany({
          where: { tagId, documentId: { in: entityIds } },
        })
        unassigned = result.count
        break
      }
      case 'project': {
        const result = await db.projectTag.deleteMany({
          where: { tagId, projectId: { in: entityIds } },
        })
        unassigned = result.count
        break
      }
    }

    return NextResponse.json({ unassigned })
  } catch (error) {
    console.error('Tags unassign POST error:', error)
    return NextResponse.json({ error: 'Échec du retrait des tags' }, { status: 500 })
  }
}
