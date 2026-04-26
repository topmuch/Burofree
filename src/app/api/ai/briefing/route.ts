import { NextResponse } from 'next/server'
import { createAIEngine } from '@/lib/ai'
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

    const [tasksToday, tasksWeek, eventsToday, eventsWeek, unreadEmails, overdueInvoices, pendingReminders, activeProjects] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, dueDate: { gte: new Date(todayStr), lt: new Date(tomorrowStr) }, status: { not: 'done' } },
        include: { project: true },
      }),
      db.task.findMany({
        where: { userId: user.id, dueDate: { gte: today, lt: weekEnd }, status: { not: 'done' } },
      }),
      db.calendarEvent.findMany({
        where: { userId: user.id, startDate: { gte: new Date(todayStr), lt: new Date(tomorrowStr) } },
        orderBy: { startDate: 'asc' },
      }),
      db.calendarEvent.findMany({
        where: { userId: user.id, startDate: { gte: today, lt: weekEnd } },
        orderBy: { startDate: 'asc' },
      }),
      db.email.findMany({
        where: { userId: user.id, isRead: false, isSent: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      db.invoice.findMany({ where: { userId: user.id, status: 'overdue' } }),
      db.reminder.findMany({
        where: { userId: user.id, isSent: false, remindAt: { lte: weekEnd } },
        orderBy: { remindAt: 'asc' },
      }),
      db.project.findMany({ where: { userId: user.id, status: 'active' } }),
    ])

    const briefingContext = `
Tâches dues aujourd'hui (${tasksToday.length}): ${tasksToday.map(t => `"${t.title}" (${t.priority}${t.project ? `, projet: ${t.project.name}` : ''})`).join(', ')}
Tâches cette semaine: ${tasksWeek.length}
Événements aujourd'hui (${eventsToday.length}): ${eventsToday.map(e => `"${e.title}" à ${new Date(e.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`).join(', ')}
Événements cette semaine: ${eventsWeek.length}
Emails non lus: ${unreadEmails.length}
Factures en retard: ${overdueInvoices.length}
Rappels à venir: ${pendingReminders.length}
Projets actifs: ${activeProjects.length}`

    const engine = createAIEngine()
    const briefing = await engine.generateBriefing(briefingContext, user.name || 'Freelancer', user.assistantName, user.assistantTone)

    return NextResponse.json({
      briefing,
      stats: {
        tasksToday: tasksToday.length,
        tasksWeek: tasksWeek.length,
        eventsToday: eventsToday.length,
        unreadEmails: unreadEmails.length,
        overdueInvoices: overdueInvoices.length,
      },
      tasksToday,
      eventsToday,
      unreadEmails,
      overdueInvoices,
      pendingReminders,
    })
  } catch (error) {
    console.error('Briefing error:', error)
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
