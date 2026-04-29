import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { userId: auth.user.id }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (projectId) where.projectId = projectId
    if (search) where.title = { contains: search }

    const tasks = await db.task.findMany({
      where,
      include: { project: true },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  try {
    const body = await req.json()

    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
        category: body.category,
        estimatedTime: body.estimatedTime,
        actualTime: body.actualTime,
        recurrence: body.recurrence,
        projectId: body.projectId || null,
        userId: auth.user.id,
      },
      include: { project: true },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
