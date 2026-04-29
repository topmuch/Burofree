import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const isRead = searchParams.get('isRead')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (isRead !== null) where.isRead = isRead === 'true'

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const notification = await db.notification.create({
      data: {
        title: body.title,
        message: body.message,
        type: body.type || 'info',
        channel: body.channel || 'in_app',
        actionUrl: body.actionUrl,
        userId: user.id,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
