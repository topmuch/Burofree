import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ suggestions: [] })

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0]

    const [overdueTasks, overdueInvoices, unreadClientEmails, upcomingDeadlines, todayTimeEntries] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } },
      }),
      db.invoice.findMany({ where: { userId: user.id, status: 'overdue' } }),
      db.email.findMany({
        where: {
          userId: user.id,
          isRead: false,
          isSent: false,
          category: 'client',
          createdAt: { lt: new Date(Date.now() - 86400000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.task.findMany({
        where: { userId: user.id, dueDate: { gte: today, lt: new Date(today.getTime() + 86400000 * 2) }, status: { not: 'done' } },
      }),
      db.timeEntry.findMany({
        where: { userId: user.id, startTime: { gte: new Date(todayStr), lt: new Date(tomorrowStr) } },
      }),
    ])

    const suggestions: { icon: string; title: string; message: string; priority: string; actionUrl: string }[] = []

    if (overdueTasks.length > 0) {
      suggestions.push({
        icon: '⚠️',
        title: 'Tâches en retard',
        message: `Vous avez ${overdueTasks.length} tâche(s) en retard: ${overdueTasks.slice(0, 2).map(t => t.title).join(', ')}`,
        priority: 'high',
        actionUrl: '#tasks',
      })
    }

    if (overdueInvoices.length > 0) {
      suggestions.push({
        icon: '💰',
        title: 'Factures impayées',
        message: `${overdueInvoices.length} facture(s) en retard de paiement. Envoyer des relances ?`,
        priority: 'high',
        actionUrl: '#invoices',
      })
    }

    if (unreadClientEmails.length > 0) {
      suggestions.push({
        icon: '📧',
        title: 'Emails clients non lus',
        message: `${unreadClientEmails.length} email(s) client en attente depuis plus de 24h`,
        priority: 'medium',
        actionUrl: '#emails',
      })
    }

    if (upcomingDeadlines.length > 0) {
      suggestions.push({
        icon: '🎯',
        title: 'Deadlines proches',
        message: `${upcomingDeadlines.length} tâche(s) dues dans les 48h: ${upcomingDeadlines.map(t => t.title).join(', ')}`,
        priority: 'medium',
        actionUrl: '#tasks',
      })
    }

    if (todayTimeEntries.length === 0) {
      suggestions.push({
        icon: '⏱️',
        title: 'Pas de temps suivi',
        message: 'Vous n\'avez pas encore suivi de temps aujourd\'hui. Pensez à démarrer un chrono !',
        priority: 'low',
        actionUrl: '#time',
      })
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
