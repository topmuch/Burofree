import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.isRead !== undefined) updateData.isRead = body.isRead
    if (body.isStarred !== undefined) updateData.isStarred = body.isStarred
    if (body.category !== undefined) updateData.category = body.category
    if (body.hasTask !== undefined) updateData.hasTask = body.hasTask

    if (body.convertToTask) {
      const email = await db.email.findUnique({ where: { id } })
      if (email) {
        const user = await db.user.findFirst()
        if (user) {
          const task = await db.task.create({
            data: {
              title: email.subject,
              description: `Depuis email de ${email.fromName || email.fromAddress}: ${email.snippet || ''}`,
              status: 'todo',
              priority: 'medium',
              userId: user.id,
            },
          })
          await db.email.update({ where: { id }, data: { hasTask: true } })
          return NextResponse.json({ email: await db.email.findUnique({ where: { id } }), task })
        }
      }
    }

    const email = await db.email.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(email)
  } catch (error) {
    console.error('Email PUT error:', error)
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.email.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 })
  }
}
