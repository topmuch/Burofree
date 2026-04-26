import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
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

    const zai = await ZAI.create()

    const briefingContext = `
Tâches dues aujourd'hui (${tasksToday.length}): ${tasksToday.map(t => `"${t.title}" (${t.priority}${t.project ? `, projet: ${t.project.name}` : ''})`).join(', ')}
Tâches cette semaine: ${tasksWeek.length}
Événements aujourd'hui (${eventsToday.length}): ${eventsToday.map(e => `"${e.title}" à ${new Date(e.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`).join(', ')}
Événements cette semaine: ${eventsWeek.length}
Emails non lus: ${unreadEmails.length}
Factures en retard: ${overdueInvoices.length}
Rappels à venir: ${pendingReminders.length}
Projets actifs: ${activeProjects.length}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: `Tu es ${user.assistantName}, l'assistant intelligent de ${user.name}. Génère un briefing matinal concis et structuré en français. Utilise des émojis pour la lisibilité. Sois encourageant mais factuel. Le ton est ${user.assistantTone}.` },
        { role: 'user', content: `Génère mon briefing du jour basé sur: ${briefingContext}` },
      ],
      temperature: 0.6,
      max_tokens: 400,
    })

    return NextResponse.json({
      briefing: completion.choices[0]?.message?.content || '',
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
