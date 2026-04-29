import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const taskId = searchParams.get('taskId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (projectId) where.projectId = projectId
    if (taskId) where.taskId = taskId
    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) (where.startTime as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.startTime as Record<string, unknown>).lte = new Date(endDate)
    }

    const entries = await db.timeEntry.findMany({
      where,
      include: { task: true, project: true },
      orderBy: { startTime: 'desc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Time entries GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const duration = body.endTime
      ? Math.floor((new Date(body.endTime).getTime() - new Date(body.startTime).getTime()) / 1000)
      : body.duration || null

    const entry = await db.timeEntry.create({
      data: {
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        duration,
        description: body.description,
        isBillable: body.isBillable !== undefined ? body.isBillable : true,
        taskId: body.taskId || null,
        projectId: body.projectId || null,
        userId: user.id,
      },
      include: { task: true, project: true },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Time entries POST error:', error)
    return NextResponse.json({ error: 'Failed to create time entry' }, { status: 500 })
  }
}
