import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const userId = searchParams.get('userId') || 'default'

    // Get or create default user
    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const where: Record<string, unknown> = { userId: user.id }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (category) where.category = category

    const tasks = await db.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des tâches' }, { status: 500 })
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

    const task = await db.task.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
        category: body.category,
        userId: user.id,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la tâche' }, { status: 500 })
  }
}
