import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const tag = await db.tag.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: {
          select: {
            taskTags: true,
            emailTags: true,
            documentTags: true,
            projectTags: true,
          },
        },
        taskTags: { include: { task: true } },
        emailTags: { include: { email: true } },
        documentTags: { include: { document: true } },
        projectTags: { include: { project: true } },
      },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const existing = await db.tag.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // If renaming, check uniqueness
    if (body.name && body.name.trim() !== existing.name) {
      const nameConflict = await db.tag.findFirst({
        where: { userId: user.id, name: body.name.trim(), NOT: { id } },
      })
      if (nameConflict) {
        return NextResponse.json(
          { error: `Tag "${body.name.trim()}" already exists` },
          { status: 409 }
        )
      }
    }

    const validCategories = ['urgent', 'client', 'status', 'billing', 'custom', 'general']
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.color !== undefined) data.color = body.color
    if (body.icon !== undefined) data.icon = body.icon
    if (body.category !== undefined) {
      data.category = validCategories.includes(body.category) ? body.category : 'general'
    }

    const tag = await db.tag.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            taskTags: true,
            emailTags: true,
            documentTags: true,
            projectTags: true,
          },
        },
      },
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag PUT error:', error)
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const existing = await db.tag.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Deleting the tag will cascade-delete all junction entries (TaskTag, EmailTag, DocumentTag, ProjectTag)
    await db.tag.delete({ where: { id } })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error) {
    console.error('Tag DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
