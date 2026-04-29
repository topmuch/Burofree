import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.message !== undefined) updateData.message = body.message
    if (body.remindAt !== undefined) updateData.remindAt = new Date(body.remindAt)
    if (body.isSent !== undefined) updateData.isSent = body.isSent
    if (body.type !== undefined) updateData.type = body.type
    if (body.relatedId !== undefined) updateData.relatedId = body.relatedId
    if (body.relatedType !== undefined) updateData.relatedType = body.relatedType

    const reminder = await db.reminder.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(reminder)
  } catch (error) {
    console.error('Reminder PUT error:', error)
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.reminder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reminder DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 })
  }
}
