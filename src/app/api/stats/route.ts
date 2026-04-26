import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0]
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Fetch all stats in parallel
    const [
      tasksToday,
      tasksWeek,
      tasksOverdue,
      tasksByStatusRaw,
      upcomingEvents,
      unreadEmails,
      emailsByCategoryRaw,
      monthlyRevenue,
      pendingInvoices,
      overdueInvoices,
      weeklyTimeEntries,
      billableTimeEntries,
      activeProjects,
      pendingReminders,
      unreadNotifications,
      completedTasksThisWeek,
      weeklyTimeEntriesByProject,
    ] = await Promise.all([
      // tasksToday: tasks due today that are not done
      db.task.count({
        where: { userId: user.id, dueDate: { gte: new Date(todayStr), lt: new Date(tomorrowStr) }, status: { not: 'done' } },
      }),
      // tasksWeek: tasks due this week that are not done
      db.task.count({
        where: { userId: user.id, dueDate: { gte: weekStart, lt: weekEnd }, status: { not: 'done' } },
      }),
      // tasksOverdue: tasks with dueDate in the past that are not done
      db.task.count({
        where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } },
      }),
      // tasksByStatus
      db.task.groupBy({ by: ['status'], where: { userId: user.id }, _count: { status: true } }),
      // upcomingEvents: events starting from today
      db.calendarEvent.count({
        where: { userId: user.id, startDate: { gte: today } },
      }),
      // unreadEmails
      db.email.count({
        where: { userId: user.id, isRead: false, isSent: false },
      }),
      // emailsByCategory
      db.email.groupBy({ by: ['category'], where: { userId: user.id }, _count: { category: true } }),
      // monthlyRevenue
      db.invoice.aggregate({
        where: { userId: user.id, status: 'paid', paidAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      // pendingInvoices
      db.invoice.count({
        where: { userId: user.id, status: 'sent' },
      }),
      // overdueInvoices
      db.invoice.count({
        where: { userId: user.id, status: 'overdue' },
      }),
      // weeklyHours (in hours)
      db.timeEntry.aggregate({
        where: { userId: user.id, startTime: { gte: weekStart } },
        _sum: { duration: true },
      }),
      // billableHours
      db.timeEntry.aggregate({
        where: { userId: user.id, startTime: { gte: weekStart }, isBillable: true },
        _sum: { duration: true },
      }),
      // activeProjects
      db.project.count({
        where: { userId: user.id, status: 'active' },
      }),
      // pendingReminders
      db.reminder.count({
        where: { userId: user.id, isSent: false },
      }),
      // unreadNotifications
      db.notification.count({
        where: { userId: user.id, isRead: false },
      }),
      // completedTasksThisWeek (for dailyCompleted)
      db.task.findMany({
        where: { userId: user.id, completedAt: { gte: weekStart } },
        select: { completedAt: true },
      }),
      // weeklyHoursByProject
      db.timeEntry.findMany({
        where: { userId: user.id, startTime: { gte: weekStart } },
        include: { project: true },
      }),
    ])

    // Build tasksByStatus object
    const tasksByStatus: Record<string, number> = { todo: 0, in_progress: 0, waiting_client: 0, done: 0 }
    tasksByStatusRaw.forEach((s) => {
      tasksByStatus[s.status] = s._count.status
    })

    // Build emailsByCategory object
    const emailsByCategory: Record<string, number> = { client: 0, admin: 0, newsletter: 0 }
    emailsByCategoryRaw.forEach((c) => {
      emailsByCategory[c.category] = c._count.category
    })

    // Build dailyCompleted: group completed tasks by date
    const dailyCompletedMap: Record<string, number> = {}
    completedTasksThisWeek.forEach((t) => {
      if (t.completedAt) {
        const dateStr = t.completedAt.toISOString().split('T')[0]
        dailyCompletedMap[dateStr] = (dailyCompletedMap[dateStr] || 0) + 1
      }
    })
    const dailyCompleted = Object.entries(dailyCompletedMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Build weeklyHoursByProject: group time entries by project
    const hoursByProjectMap: Record<string, number> = {}
    weeklyTimeEntriesByProject.forEach((e) => {
      const projectName = e.project?.name || 'Autre'
      hoursByProjectMap[projectName] = (hoursByProjectMap[projectName] || 0) + (e.duration || 0)
    })
    const weeklyHoursByProject = Object.entries(hoursByProjectMap).map(([project, seconds]) => ({
      project,
      hours: Math.round((seconds / 3600) * 100) / 100,
    }))

    // Build monthlyRevenueHistory: last 6 months
    const monthlyRevenueHistory = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59)
      const revenue = await db.invoice.aggregate({
        where: { userId: user.id, status: 'paid', paidAt: { gte: mStart, lte: mEnd } },
        _sum: { total: true },
      })
      monthlyRevenueHistory.push({
        month: mStart.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: revenue._sum.total || 0,
      })
    }

    // Convert duration seconds to hours
    const weeklyHours = Math.round(((weeklyTimeEntries._sum.duration || 0) / 3600) * 100) / 100
    const billableHours = Math.round(((billableTimeEntries._sum.duration || 0) / 3600) * 100) / 100

    return NextResponse.json({
      tasksToday,
      tasksWeek,
      tasksOverdue,
      tasksByStatus,
      upcomingEvents,
      unreadEmails,
      emailsByCategory,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      pendingInvoices,
      overdueInvoices,
      weeklyHours,
      billableHours,
      activeProjects,
      pendingReminders,
      unreadNotifications,
      dailyCompleted,
      weeklyHoursByProject,
      monthlyRevenueHistory,
    })
  } catch (error) {
    console.error('Stats GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
