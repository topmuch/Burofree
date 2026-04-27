import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type EntityType = 'task' | 'email' | 'document' | 'project'

interface UnassignBody {
  tagId: string
  entityType: EntityType
  entityIds: string[]
}

export async function POST(req: NextRequest) {
  try {
    const body: UnassignBody = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const { tagId, entityType, entityIds } = body

    if (!tagId || !entityType || !Array.isArray(entityIds) || entityIds.length === 0) {
      return NextResponse.json(
        { error: 'tagId, entityType, and entityIds (non-empty array) are required' },
        { status: 400 }
      )
    }

    const validTypes: EntityType[] = ['task', 'email', 'document', 'project']
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        { error: `entityType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the tag belongs to the user
    const tag = await db.tag.findFirst({
      where: { id: tagId, userId: user.id },
    })
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
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
    return NextResponse.json({ error: 'Failed to unassign tags' }, { status: 500 })
  }
}
