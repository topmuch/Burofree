import { NextResponse } from 'next/server'
import { createAIEngine, type MentalLoadContext } from '@/lib/ai'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0]
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1) // Monday

    const [
      overdueTasks,
      tasksDueToday,
      tasksDueThisWeek,
      unreadClientEmails,
      overdueInvoices,
      upcomingDeadlines,
      activeProjects,
      eventsToday,
      eventsThisWeek,
      completedTasksThisWeek,
      timeEntriesThisWeek,
      timeEntriesWithEstimates,
      totalPendingTasks,
    ] = await Promise.all([
      // Overdue tasks
      db.task.count({
        where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } },
      }),
      // Tasks due today
      db.task.count({
        where: { userId: user.id, dueDate: { gte: new Date(todayStr), lt: new Date(tomorrowStr) }, status: { not: 'done' } },
      }),
      // Tasks due this week
      db.task.count({
        where: { userId: user.id, dueDate: { gte: today, lt: weekEnd }, status: { not: 'done' } },
      }),
      // Unread client emails
      db.email.count({
        where: { userId: user.id, isRead: false, isSent: false, category: 'client' },
      }),
      // Overdue invoices
      db.invoice.count({
        where: { userId: user.id, status: 'overdue' },
      }),
      // Upcoming deadlines (events of type deadline)
      db.calendarEvent.count({
        where: { userId: user.id, type: 'deadline', startDate: { gte: today, lt: weekEnd } },
      }),
      // Active projects
      db.project.count({
        where: { userId: user.id, status: 'active' },
      }),
      // Meetings today
      db.calendarEvent.count({
        where: { userId: user.id, type: 'meeting', startDate: { gte: new Date(todayStr), lt: new Date(tomorrowStr) } },
      }),
      // Meetings this week
      db.calendarEvent.count({
        where: { userId: user.id, type: 'meeting', startDate: { gte: today, lt: weekEnd } },
      }),
      // Completed tasks this week
      db.task.count({
        where: { userId: user.id, completedAt: { gte: weekStart } },
      }),
      // Time entries this week (for tracked hours)
      db.timeEntry.findMany({
        where: { userId: user.id, startTime: { gte: weekStart } },
      }),
      // Tasks with estimated vs actual time
      db.task.findMany({
        where: { userId: user.id, estimatedTime: { not: null }, actualTime: { not: null } },
        select: { estimatedTime: true, actualTime: true },
      }),
      // Total pending tasks
      db.task.count({
        where: { userId: user.id, status: { not: 'done' } },
      }),
    ])

    // Calculate time tracked vs estimated
    const totalTrackedSeconds = timeEntriesThisWeek.reduce((sum, e) => sum + (e.duration || 0), 0)
    const totalEstimatedMinutes = timeEntriesWithEstimates.reduce((sum, t) => sum + (t.estimatedTime || 0), 0)
    const totalActualMinutes = timeEntriesWithEstimates.reduce((sum, t) => sum + (t.actualTime || 0), 0)

    const context: MentalLoadContext = {
      overdueTasks,
      tasksDueToday,
      tasksDueThisWeek,
      unreadClientEmails,
      overdueInvoices,
      upcomingDeadlines,
      timeTrackedVsEstimated: {
        tracked: Math.round(totalTrackedSeconds / 3600 * 10) / 10,
        estimated: Math.round(totalEstimatedMinutes / 60 * 10) / 10 || Math.round(totalActualMinutes / 60 * 10) / 10,
      },
      activeProjects,
      meetingsToday: eventsToday,
      meetingsThisWeek: eventsThisWeek,
      completedTasksThisWeek,
      totalPendingTasks,
      userName: user.name || 'Freelancer',
      assistantName: user.assistantName,
      assistantTone: user.assistantTone,
    }

    const engine = createAIEngine()
    const analysis = await engine.analyzeMentalLoad(context)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Mental load analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze mental load' }, { status: 500 })
  }
}
