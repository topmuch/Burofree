import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime)
    if (body.endTime !== undefined) {
      updateData.endTime = new Date(body.endTime)
      // Calculate duration from startTime + endTime
      const entry = await db.timeEntry.findUnique({ where: { id } })
      if (entry) {
        const start = body.startTime ? new Date(body.startTime) : entry.startTime
        updateData.duration = Math.floor((new Date(body.endTime).getTime() - start.getTime()) / 1000)
      }
    }
    if (body.duration !== undefined) updateData.duration = body.duration
    if (body.description !== undefined) updateData.description = body.description
    if (body.isBillable !== undefined) updateData.isBillable = body.isBillable
    if (body.taskId !== undefined) updateData.taskId = body.taskId || null
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null

    const entry = await db.timeEntry.update({
      where: { id },
      data: updateData,
      include: { task: true, project: true },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Time entry PUT error:', error)
    return NextResponse.json({ error: 'Failed to update time entry' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.timeEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Time entry DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete time entry' }, { status: 500 })
  }
}
