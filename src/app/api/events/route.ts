import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const where: Record<string, unknown> = { userId: user.id }
    if (start && end) {
      where.startDate = {
        gte: new Date(start),
        lte: new Date(end),
      }
    }

    const events = await db.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des événements' }, { status: 500 })
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

    const event = await db.calendarEvent.create({
      data: {
        title: body.title,
        description: body.description,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        color: body.color || '#10b981',
        allDay: body.allDay || false,
        location: body.location,
        userId: user.id,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'événement' }, { status: 500 })
  }
}
