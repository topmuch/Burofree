import { NextResponse } from 'next/server'
import { createAIEngine, type TaskDescription } from '@/lib/ai'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const pendingTasks = await db.task.findMany({
      where: { userId: user.id, status: { not: 'done' } },
      include: { project: true },
      take: 20,
    })

    if (pendingTasks.length === 0) {
      return NextResponse.json({ message: 'Aucune tâche à prioriser', updates: [] })
    }

    const tasks: TaskDescription[] = pendingTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : null,
      projectName: t.project?.name || null,
      category: t.category || null,
    }))

    try {
      const engine = createAIEngine()
      const updates = await engine.prioritizeTasks(tasks)
      return NextResponse.json({ updates })
    } catch (aiError) {
      console.error('AI prioritize error:', aiError)
    }

    return NextResponse.json({ updates: [] })
  } catch (error) {
    console.error('Prioritize error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
