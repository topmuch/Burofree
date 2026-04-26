import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekEnd = new Date(today.getTime() + 7 * 86400000)

    const [
      tasksDueToday,
      tasksThisWeek,
      upcomingEvents,
      unreadEmails,
      totalTasks,
      completedTasks,
      pendingReminders,
    ] = await Promise.all([
      db.task.count({
        where: {
          userId: user.id,
          dueDate: { gte: today, lt: new Date(today.getTime() + 86400000) },
          status: { not: 'done' },
        },
      }),
      db.task.count({
        where: {
          userId: user.id,
          dueDate: { gte: today, lt: weekEnd },
          status: { not: 'done' },
        },
      }),
      db.calendarEvent.count({
        where: {
          userId: user.id,
          startDate: { gte: today, lt: weekEnd },
        },
      }),
      db.email.count({
        where: {
          userId: user.id,
          isRead: false,
          isSent: false,
        },
      }),
      db.task.count({
        where: { userId: user.id },
      }),
      db.task.count({
        where: { userId: user.id, status: 'done' },
      }),
      db.reminder.count({
        where: { userId: user.id, isSent: false },
      }),
    ])

    // Tasks completed per day for the last 7 days
    const dailyCompleted = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 86400000)
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const count = await db.task.count({
        where: {
          userId: user.id,
          status: 'done',
          completedAt: { gte: dayStart, lt: dayEnd },
        },
      })
      dailyCompleted.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      })
    }

    // Task status breakdown
    const todoCount = await db.task.count({ where: { userId: user.id, status: 'todo' } })
    const inProgressCount = await db.task.count({ where: { userId: user.id, status: 'in_progress' } })
    const doneCount = completedTasks

    return NextResponse.json({
      tasksDueToday,
      tasksThisWeek,
      upcomingEvents,
      unreadEmails,
      totalTasks,
      completedTasks,
      pendingReminders,
      dailyCompleted,
      taskBreakdown: { todo: todoCount, inProgress: inProgressCount, done: doneCount },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des statistiques' }, { status: 500 })
  }
}
