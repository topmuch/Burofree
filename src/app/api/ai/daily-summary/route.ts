import { NextResponse } from 'next/server'
import { createAIEngine } from '@/lib/ai'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const [completedTasks, timeEntries, emailsSent, eventsToday] = await Promise.all([
      db.task.findMany({ where: { userId: user.id, completedAt: { gte: new Date(todayStr) } } }),
      db.timeEntry.findMany({ where: { userId: user.id, startTime: { gte: new Date(todayStr) } } }),
      db.email.count({ where: { userId: user.id, isSent: true, createdAt: { gte: new Date(todayStr) } } }),
      db.calendarEvent.findMany({ where: { userId: user.id, startDate: { gte: new Date(todayStr), lt: new Date(todayStr + 'T23:59:59') } } }),
    ])

    const totalHours = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600
    const billableHours = timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.duration || 0), 0) / 3600

    const context = `
Tâches complétées: ${completedTasks.map(t => t.title).join(', ') || 'Aucune'}
Heures travaillées: ${totalHours.toFixed(1)}h (facturables: ${billableHours.toFixed(1)}h)
Emails envoyés: ${emailsSent}
Réunions/événements: ${eventsToday.length}`

    try {
      const engine = createAIEngine()
      const summary = await engine.generateDailySummary(context, user.name || 'Freelancer', user.assistantName)
      return NextResponse.json({ summary, stats: { completedTasks: completedTasks.length, totalHours, billableHours, emailsSent, events: eventsToday.length } })
    } catch (aiError) {
      console.error('AI summary error:', aiError)
      return NextResponse.json({ summary: `Journée terminée ! ${completedTasks.length} tâche(s) complétée(s), ${totalHours.toFixed(1)}h travaillées.`, stats: { completedTasks: completedTasks.length, totalHours, billableHours, emailsSent, events: eventsToday.length } })
    }
  } catch (error) {
    console.error('Daily summary error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
