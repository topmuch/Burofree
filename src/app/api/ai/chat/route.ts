import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const [tasksToday, upcomingEvents, unreadEmails, pendingReminders, overdueInvoices, activeProjects] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, dueDate: { gte: new Date(todayStr), lt: new Date(todayStr + 'T23:59:59') }, status: { not: 'done' } },
        include: { project: true },
      }),
      db.calendarEvent.findMany({
        where: { userId: user.id, startDate: { gte: today } },
        take: 5,
        orderBy: { startDate: 'asc' },
      }),
      db.email.count({ where: { userId: user.id, isRead: false, isSent: false } }),
      db.reminder.findMany({
        where: { userId: user.id, isSent: false, remindAt: { lte: new Date(Date.now() + 3600000) } },
      }),
      db.invoice.findMany({ where: { userId: user.id, status: 'overdue' } }),
      db.project.findMany({ where: { userId: user.id, status: 'active' } }),
    ])

    const chatHistory = await db.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const zai = await ZAI.create()

    const systemPrompt = `Tu es ${user.assistantName}, l'assistant intelligent personnel d'un freelancer nommé ${user.name}. Ton ton est ${user.assistantTone === 'pro' ? 'professionnel et concis' : user.assistantTone === 'friendly' ? 'amical, chaleureux et encourageant' : 'minimaliste et direct'}.

Contexte actuel:
- Profession: ${user.profession || 'Freelancer'}
- Tâches dues aujourd'hui: ${tasksToday.map(t => `"${t.title}" (${t.priority})`).join(', ') || 'Aucune'}
- Prochains événements: ${upcomingEvents.map(e => `"${e.title}" le ${new Date(e.startDate).toLocaleDateString('fr-FR')}`).join(', ') || 'Aucun'}
- Emails non lus: ${unreadEmails}
- Rappels à venir: ${pendingReminders.map(r => `"${r.title}"`).join(', ') || 'Aucun'}
- Factures en retard: ${overdueInvoices.map(i => `"${i.number}" - ${i.clientName}`).join(', ') || 'Aucune'}
- Projets actifs: ${activeProjects.map(p => `"${p.name}" (${p.clientName})`).join(', ') || 'Aucun'}

Tu peux répondre aux questions, suggérer des priorités, aider à organiser la journée, proposer des réponses emails, donner des conseils de productivité. Réponds toujours en français. Sois utile, proactif et concis.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ]

    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const assistantMessage = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.'

    await db.chatMessage.create({ data: { role: 'user', content: message, userId: user.id } })
    await db.chatMessage.create({ data: { role: 'assistant', content: assistantMessage, userId: user.id } })

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
