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

    // Use findMany + manual aggregation instead of aggregate() to avoid Prisma cache issues
    const [
      tasksToday,
      tasksWeek,
      tasksOverdue,
      tasksByStatusRaw,
      upcomingEvents,
      unreadEmails,
      emailsByCategoryRaw,
      paidInvoicesThisMonth,
      pendingInvoices,
      overdueInvoices,
      weeklyTimeEntriesRaw,
      billableTimeEntriesRaw,
      activeProjects,
      pendingReminders,
      unreadNotifications,
      completedTasksThisWeek,
      weeklyTimeEntriesByProject,
      allPaidInvoices,
    ] = await Promise.all([
      db.task.count({
        where: { userId: user.id, dueDate: { gte: new Date(todayStr), lt: new Date(tomorrowStr) }, status: { not: 'done' } },
      }),
      db.task.count({
        where: { userId: user.id, dueDate: { gte: weekStart, lt: weekEnd }, status: { not: 'done' } },
      }),
      db.task.count({
        where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } },
      }),
      db.task.groupBy({ by: ['status'], where: { userId: user.id }, _count: { status: true } }),
      db.calendarEvent.count({
        where: { userId: user.id, startDate: { gte: today } },
      }),
      db.email.count({
        where: { userId: user.id, isRead: false, isSent: false },
      }),
      db.email.groupBy({ by: ['category'], where: { userId: user.id }, _count: { category: true } }),
      db.invoice.findMany({
        where: { userId: user.id, status: 'paid', paidAt: { gte: monthStart } },
        select: { total: true },
      }),
      db.invoice.count({
        where: { userId: user.id, status: 'sent' },
      }),
      db.invoice.count({
        where: { userId: user.id, status: 'overdue' },
      }),
      db.timeEntry.findMany({
        where: { userId: user.id, startTime: { gte: weekStart }, duration: { not: null } },
        select: { duration: true },
      }),
      db.timeEntry.findMany({
        where: { userId: user.id, startTime: { gte: weekStart }, isBillable: true, duration: { not: null } },
        select: { duration: true },
      }),
      db.project.count({
        where: { userId: user.id, status: 'active' },
      }),
      db.reminder.count({
        where: { userId: user.id, isSent: false },
      }),
      db.notification.count({
        where: { userId: user.id, isRead: false },
      }),
      db.task.findMany({
        where: { userId: user.id, completedAt: { gte: weekStart } },
        select: { completedAt: true },
      }),
      db.timeEntry.findMany({
        where: { userId: user.id, startTime: { gte: weekStart }, duration: { not: null } },
        include: { project: { select: { name: true } } },
      }),
      db.invoice.findMany({
        where: { userId: user.id, status: 'paid', paidAt: { not: null } },
        select: { total: true, paidAt: true },
      }),
    ])

    const tasksByStatus: Record<string, number> = { todo: 0, in_progress: 0, waiting_client: 0, done: 0 }
    tasksByStatusRaw.forEach((s) => { tasksByStatus[s.status] = s._count.status })

    const emailsByCategory: Record<string, number> = { client: 0, admin: 0, newsletter: 0 }
    emailsByCategoryRaw.forEach((c) => { emailsByCategory[c.category] = c._count.category })

    const monthlyRevenue = paidInvoicesThisMonth.reduce((sum, inv) => sum + (inv.total || 0), 0)

    const weeklyHours = Math.round((weeklyTimeEntriesRaw.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600) * 100) / 100
    const billableHours = Math.round((billableTimeEntriesRaw.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600) * 100) / 100

    const dailyCompletedMap: Record<string, number> = {}
    completedTasksThisWeek.forEach((t) => {
      if (t.completedAt) {
        const dateStr = t.completedAt.toISOString().split('T')[0]
        dailyCompletedMap[dateStr] = (dailyCompletedMap[dateStr] || 0) + 1
      }
    })
    const dailyCompleted = Object.entries(dailyCompletedMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))

    const hoursByProjectMap: Record<string, number> = {}
    weeklyTimeEntriesByProject.forEach((e) => {
      const projectName = (e as { project?: { name: string } | null }).project?.name || 'Autre'
      hoursByProjectMap[projectName] = (hoursByProjectMap[projectName] || 0) + (e.duration || 0)
    })
    const weeklyHoursByProject = Object.entries(hoursByProjectMap).map(([project, seconds]) => ({
      project,
      hours: Math.round((seconds / 3600) * 100) / 100,
    }))

    const monthlyRevenueHistory = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59)
      const revenue = allPaidInvoices
        .filter(inv => inv.paidAt && inv.paidAt >= mStart && inv.paidAt <= mEnd)
        .reduce((sum, inv) => sum + (inv.total || 0), 0)
      monthlyRevenueHistory.push({
        month: mStart.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue,
      })
    }

    return NextResponse.json({
      tasksToday,
      tasksWeek,
      tasksOverdue,
      tasksByStatus,
      upcomingEvents,
      unreadEmails,
      emailsByCategory,
      monthlyRevenue,
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
