import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const maxDuration = 10 // 10 second max execution time

/**
 * Timeout wrapper for async operations.
 * Returns null if the operation exceeds the timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ suggestions: [] })

    const today = new Date()

    // Gather context with a timeout
    const contextData = await withTimeout(
      Promise.all([
        db.task.findMany({ where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } }, take: 5 }),
        db.task.findMany({ where: { userId: user.id, dueDate: { gte: today, lt: new Date(today.getTime() + 86400000 * 2) }, status: { not: 'done' } }, take: 5 }),
        db.email.findMany({ where: { userId: user.id, isRead: false, isSent: false, category: 'client' }, take: 5, orderBy: { createdAt: 'desc' } }),
        db.invoice.findMany({ where: { userId: user.id, status: 'overdue' }, take: 3 }),
        db.calendarEvent.findMany({ where: { userId: user.id, startDate: { gte: today } }, take: 3, orderBy: { startDate: 'asc' } }),
        db.project.findMany({ where: { userId: user.id, status: 'active' }, take: 5 }),
        db.timeEntry.findMany({ where: { userId: user.id, startTime: { gte: new Date(today.toISOString().split('T')[0]) } } }),
      ]),
      5000 // 5 second max for DB queries
    )

    if (!contextData) {
      // DB queries timed out, return empty suggestions
      return NextResponse.json({ suggestions: [] })
    }

    const [overdueTasks, tasksDueSoon, unreadClientEmails, overdueInvoices, upcomingEvents, activeProjects, timeEntriesToday] = contextData

    // Try AI engine with a strict timeout (3 seconds max)
    try {
      const { createAIEngine } = await import('@/lib/ai')
      const engine = createAIEngine()
      const aiSuggestions = await withTimeout(
        engine.generateSuggestions(
          `Tâches en retard: ${overdueTasks.length}, Tâches dues bientôt: ${tasksDueSoon.length}, Emails non lus: ${unreadClientEmails.length}, Factures en retard: ${overdueInvoices.length}, Projets actifs: ${activeProjects.length}`,
          user.name || 'Freelancer',
          user.assistantName,
          user.assistantTone
        ),
        3000
      )
      if (aiSuggestions && aiSuggestions.length > 0) {
        return NextResponse.json({ suggestions: aiSuggestions })
      }
    } catch (aiError) {
      console.error('AI suggestions error, falling back to rules:', aiError)
    }

    // Fallback: rule-based suggestions (always fast)
    const suggestions: Array<{ icon: string; title: string; message: string; priority: string; actionUrl: string }> = []
    if (overdueTasks.length > 0) {
      suggestions.push({ icon: '!', title: 'Tâches en retard', message: `${overdueTasks.length} tâche(s) dépassent leur échéance. Priorisez: ${overdueTasks[0].title}`, priority: 'high', actionUrl: '#tasks' })
    }
    if (overdueInvoices.length > 0) {
      suggestions.push({ icon: '$', title: 'Factures impayées', message: `${overdueInvoices.length} facture(s) en retard de paiement. Envoyez des relances.`, priority: 'high', actionUrl: '#invoices' })
    }
    if (unreadClientEmails.length > 0) {
      suggestions.push({ icon: '@', title: 'Emails clients', message: `${unreadClientEmails.length} email(s) client non lu(s). Répondez rapidement pour maintenir la relation.`, priority: 'medium', actionUrl: '#emails' })
    }
    if (tasksDueSoon.length > 0) {
      suggestions.push({ icon: '*', title: 'Échéances proches', message: `${tasksDueSoon.length} tâche(s) due(s) dans les 48h.`, priority: 'medium', actionUrl: '#tasks' })
    }
    if (timeEntriesToday.length === 0) {
      suggestions.push({ icon: '#', title: 'Tracker votre temps', message: `Aucun temps tracké aujourd'hui. Démarrez un chrono pour vos tâches.`, priority: 'low', actionUrl: '#time' })
    }
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
