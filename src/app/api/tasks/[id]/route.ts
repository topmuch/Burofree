import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'done') updateData.completedAt = new Date()
    }
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.reminderAt !== undefined) updateData.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null
    if (body.category !== undefined) updateData.category = body.category
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime
    if (body.actualTime !== undefined) updateData.actualTime = body.actualTime
    if (body.recurrence !== undefined) updateData.recurrence = body.recurrence
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: { project: true },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Task PUT error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Task DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
