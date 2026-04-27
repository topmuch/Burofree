import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type EntityType = 'task' | 'email' | 'document' | 'project'

interface AssignBody {
  tagId: string
  entityType: EntityType
  entityIds: string[]
}

export async function POST(req: NextRequest) {
  try {
    const body: AssignBody = await req.json()
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

    let assigned = 0

    // Bulk assign with duplicate prevention using createMany + skipDuplicates
    switch (entityType) {
      case 'task': {
        const data = entityIds.map((taskId) => ({ tagId, taskId }))
        const result = await db.taskTag.createMany({ data, skipDuplicates: true })
        assigned = result.count
        break
      }
      case 'email': {
        const data = entityIds.map((emailId) => ({ tagId, emailId }))
        const result = await db.emailTag.createMany({ data, skipDuplicates: true })
        assigned = result.count
        break
      }
      case 'document': {
        const data = entityIds.map((documentId) => ({ tagId, documentId }))
        const result = await db.documentTag.createMany({ data, skipDuplicates: true })
        assigned = result.count
        break
      }
      case 'project': {
        const data = entityIds.map((projectId) => ({ tagId, projectId }))
        const result = await db.projectTag.createMany({ data, skipDuplicates: true })
        assigned = result.count
        break
      }
    }

    return NextResponse.json({ assigned })
  } catch (error) {
    console.error('Tags assign POST error:', error)
    return NextResponse.json({ error: 'Failed to assign tags' }, { status: 500 })
  }
}
