import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pending = searchParams.get('pending')

    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const where: Record<string, unknown> = { userId: user.id }
    if (pending === 'true') {
      where.isSent = false
    }

    const reminders = await db.reminder.findMany({
      where,
      orderBy: { remindAt: 'asc' },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des rappels' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const reminder = await db.reminder.create({
      data: {
        title: body.title,
        message: body.message,
        remindAt: new Date(body.remindAt),
        type: body.type || 'notification',
        relatedId: body.relatedId,
        userId: user.id,
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du rappel' }, { status: 500 })
  }
}
