import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (status) where.status = status
    if (type) where.type = type
    if (projectId) where.projectId = projectId
    if (search) where.title = { contains: search }

    const meetings = await db.meeting.findMany({
      where,
      include: { project: true },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json(meetings)
  } catch (error) {
    console.error('Meetings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }
    if (!body.userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const meeting = await db.meeting.create({
      data: {
        title: body.title,
        description: body.description,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        location: body.location,
        meetingUrl: body.meetingUrl,
        type: body.type || 'video',
        status: body.status || 'scheduled',
        agenda: body.agenda,
        notes: body.notes,
        projectId: body.projectId || null,
        userId: body.userId,
      },
      include: { project: true },
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('Meetings POST error:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
