import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.isRead !== undefined) updateData.isRead = body.isRead
    if (body.title !== undefined) updateData.title = body.title
    if (body.message !== undefined) updateData.message = body.message
    if (body.type !== undefined) updateData.type = body.type
    if (body.channel !== undefined) updateData.channel = body.channel
    if (body.actionUrl !== undefined) updateData.actionUrl = body.actionUrl

    const notification = await db.notification.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Notification PUT error:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.notification.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}
