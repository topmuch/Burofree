import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ suggestions: [] })

    const today = new Date()

    // Gather context
    const [overdueTasks, tasksDueSoon, unreadClientEmails, overdueInvoices, upcomingEvents, activeProjects, timeEntriesToday] = await Promise.all([
      db.task.findMany({ where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } }, take: 5 }),
      db.task.findMany({ where: { userId: user.id, dueDate: { gte: today, lt: new Date(today.getTime() + 86400000 * 2) }, status: { not: 'done' } }, take: 5 }),
      db.email.findMany({ where: { userId: user.id, isRead: false, isSent: false, category: 'client' }, take: 5, orderBy: { createdAt: 'desc' } }),
      db.invoice.findMany({ where: { userId: user.id, status: 'overdue' }, take: 3 }),
      db.calendarEvent.findMany({ where: { userId: user.id, startDate: { gte: today } }, take: 3, orderBy: { startDate: 'asc' } }),
      db.project.findMany({ where: { userId: user.id, status: 'active' }, take: 5 }),
      db.timeEntry.findMany({ where: { userId: user.id, startTime: { gte: new Date(today.toISOString().split('T')[0]) } } }),
    ])

    // Build context string
    const context = `
Tâches en retard: ${overdueTasks.length > 0 ? overdueTasks.map(t => `"${t.title}" (priorité: ${t.priority}, projet: ${t.projectId || 'aucun'})`).join(', ') : 'Aucune'}
Tâches dues bientôt: ${tasksDueSoon.length > 0 ? tasksDueSoon.map(t => `"${t.title}" (due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : 'N/A'})`).join(', ') : 'Aucune'}
Emails clients non lus: ${unreadClientEmails.length} (${unreadClientEmails.map(e => `de ${e.fromName || e.fromAddress}: "${e.subject}"`).join('; ') || 'Aucun'})
Factures en retard: ${overdueInvoices.length > 0 ? overdueInvoices.map(i => `"${i.number}" - ${i.clientName} (${i.total}€)`).join(', ') : 'Aucune'}
Événements à venir: ${upcomingEvents.map(e => `"${e.title}" le ${new Date(e.startDate).toLocaleDateString('fr-FR')}`).join(', ') || 'Aucun'}
Projets actifs: ${activeProjects.map(p => `"${p.name}" (${p.clientName})`).join(', ') || 'Aucun'}
Temps tracké aujourd'hui: ${timeEntriesToday.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600}h
Heure actuelle: ${today.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
    `.trim()

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Tu es ${user.assistantName}, l'assistant IA d'un freelancer nommé ${user.name}. Analyse la situation et génère 3-5 suggestions ACTIONABLES et PRIORISÉES. Chaque suggestion doit être concise et spécifique. Réponds en JSON uniquement avec ce format:
[{"icon": "emoji", "title": "titre court", "message": "description actionnable en 1 phrase", "priority": "high|medium|low", "actionUrl": "#tasks|#emails|#invoices|#calendar|#time"}]
Priorise: 1) Urgences (retards) 2) Actions immédiates 3) Optimisations. Réponds en français.`
          },
          { role: 'user', content: `Voici mon contexte actuel:\n${context}` }
        ],
        temperature: 0.6,
        max_tokens: 600,
      })

      const responseText = completion.choices[0]?.message?.content || '[]'
      // Try to parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0])
        return NextResponse.json({ suggestions })
      }
    } catch (aiError) {
      console.error('AI suggestions error, falling back to rules:', aiError)
    }

    // Fallback: rule-based suggestions
    const suggestions = []
    if (overdueTasks.length > 0) {
      suggestions.push({ icon: '⚠️', title: 'Tâches en retard', message: `${overdueTasks.length} tâche(s) dépassent leur échéance. Priorisez: ${overdueTasks[0].title}`, priority: 'high', actionUrl: '#tasks' })
    }
    if (overdueInvoices.length > 0) {
      suggestions.push({ icon: '💰', title: 'Factures impayées', message: `${overdueInvoices.length} facture(s) en retard de paiement. Envoyez des relances.`, priority: 'high', actionUrl: '#invoices' })
    }
    if (unreadClientEmails.length > 0) {
      suggestions.push({ icon: '📧', title: 'Emails clients', message: `${unreadClientEmails.length} email(s) client non lu(s). Répondez rapidement pour maintenir la relation.`, priority: 'medium', actionUrl: '#emails' })
    }
    if (tasksDueSoon.length > 0) {
      suggestions.push({ icon: '🎯', title: 'Échéances proches', message: `${tasksDueSoon.length} tâche(s) due(s) dans les 48h.`, priority: 'medium', actionUrl: '#tasks' })
    }
    if (timeEntriesToday.length === 0) {
      suggestions.push({ icon: '⏱️', title: 'Tracker votre temps', message: `Aucun temps tracké aujourd'hui. Démarrez un chrono pour vos tâches.`, priority: 'low', actionUrl: '#time' })
    }
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
