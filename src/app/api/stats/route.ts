import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

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

    // Only use count() queries — no findMany or groupBy to keep memory low
    const [
      tasksToday,
      tasksWeek,
      tasksOverdue,
      totalTasks,
      todoCount,
      inProgressCount,
      waitingClientCount,
      doneCount,
      completedTasksThisWeek,
      upcomingEvents,
      unreadEmails,
      pendingInvoices,
      overdueInvoices,
      activeProjects,
      pendingReminders,
      unreadNotifications,
    ] = await Promise.all([
      db.task.count({ where: { userId: user.id, dueDate: { gte: new Date(todayStr), lt: new Date(tomorrowStr) }, status: { not: 'done' } } }),
      db.task.count({ where: { userId: user.id, dueDate: { gte: weekStart, lt: weekEnd }, status: { not: 'done' } } }),
      db.task.count({ where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } } }),
      db.task.count({ where: { userId: user.id } }),
      db.task.count({ where: { userId: user.id, status: 'todo' } }),
      db.task.count({ where: { userId: user.id, status: 'in_progress' } }),
      db.task.count({ where: { userId: user.id, status: 'waiting_client' } }),
      db.task.count({ where: { userId: user.id, status: 'done' } }),
      db.task.count({ where: { userId: user.id, completedAt: { gte: weekStart } } }),
      db.calendarEvent.count({ where: { userId: user.id, startDate: { gte: today } } }),
      db.email.count({ where: { userId: user.id, isRead: false, isSent: false } }),
      db.invoice.count({ where: { userId: user.id, status: 'sent' } }),
      db.invoice.count({ where: { userId: user.id, status: 'overdue' } }),
      db.project.count({ where: { userId: user.id, status: 'active' } }),
      db.reminder.count({ where: { userId: user.id, isSent: false } }),
      db.notification.count({ where: { userId: user.id, isRead: false } }),
    ])

    // Revenue — one lightweight query
    const paidMonth = await db.invoice.findMany({
      where: { userId: user.id, status: 'paid', paidAt: { gte: monthStart } },
      select: { total: true },
    })
    const monthlyRevenue = paidMonth.reduce((s, i) => s + (i.total || 0), 0)

    // All paid invoices for yearly + monthly history
    const allPaid = await db.invoice.findMany({
      where: { userId: user.id, status: 'paid', paidAt: { not: null } },
      select: { total: true, paidAt: true },
    })
    const yearlyRevenue = allPaid.reduce((s, i) => s + (i.total || 0), 0)

    const monthlyData: { month: string; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59)
      const revenue = allPaid.filter(inv => inv.paidAt && inv.paidAt >= mStart && inv.paidAt <= mEnd).reduce((s, i) => s + (i.total || 0), 0)
      monthlyData.push({ month: mStart.toLocaleDateString('fr-FR', { month: 'short' }), revenue })
    }

    // Time tracking — minimal query
    const timeEntries = await db.timeEntry.findMany({
      where: { userId: user.id, startTime: { gte: weekStart }, duration: { not: null } },
      select: { duration: true, isBillable: true },
    })
    const weeklyHours = Math.round((timeEntries.reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100) / 100
    const billableHours = Math.round((timeEntries.filter(e => e.isBillable).reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100) / 100

    return NextResponse.json({
      tasksToday, tasksWeek, tasksOverdue,
      tasksByStatus: { todo: todoCount, in_progress: inProgressCount, waiting_client: waitingClientCount, done: doneCount },
      eventsToday: upcomingEvents, unreadEmails, totalTasks, completedTasksThisWeek,
      paidInvoices: 0, pendingInvoices, overdueInvoices,
      monthlyRevenue, yearlyRevenue, weeklyHours, billableHours, activeProjects,
      weekDays: [] as { date: string; day: string; totalHours: number; byProject: Record<string, number> }[],
      monthlyData,
    })
  } catch (error) {
    console.error('Stats GET error:', error)
    return NextResponse.json({
      tasksToday: 0, tasksWeek: 0, tasksOverdue: 0,
      tasksByStatus: { todo: 0, in_progress: 0, waiting_client: 0, done: 0 },
      eventsToday: 0, unreadEmails: 0, totalTasks: 0, completedTasksThisWeek: 0,
      paidInvoices: 0, pendingInvoices: 0, overdueInvoices: 0,
      monthlyRevenue: 0, yearlyRevenue: 0, weeklyHours: 0, billableHours: 0,
      activeProjects: 0, weekDays: [], monthlyData: [],
    })
  }
}
