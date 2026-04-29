import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pending = searchParams.get('pending')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (pending === 'true') where.isSent = false

    const reminders = await db.reminder.findMany({
      where,
      orderBy: { remindAt: 'asc' },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Reminders GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const reminder = await db.reminder.create({
      data: {
        title: body.title,
        message: body.message,
        remindAt: new Date(body.remindAt),
        type: body.type || 'in_app',
        relatedId: body.relatedId,
        relatedType: body.relatedType,
        userId: user.id,
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error('Reminders POST error:', error)
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
  }
}
