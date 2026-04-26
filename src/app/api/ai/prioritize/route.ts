import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const pendingTasks = await db.task.findMany({
      where: { userId: user.id, status: { not: 'done' } },
      include: { project: true },
      take: 20,
    })

    if (pendingTasks.length === 0) {
      return NextResponse.json({ message: 'Aucune tâche à prioriser', updates: [] })
    }

    const tasksDescription = pendingTasks.map(t =>
      `ID:${t.id}|"${t.title}"|Priorité:${t.priority}|Échéance:${t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : 'N/A'}|Projet:${t.project?.name || 'Aucun'}|Catégorie:${t.category || 'N/A'}`
    ).join('\n')

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant de productivité. Analyse les tâches et suggère une priorisation optimisée. Réponds en JSON: [{"id": "taskId", "suggestedPriority": "urgent|high|medium|low", "reason": "courte raison"}]. Seulement les tâches qui méritent un changement de priorité.`
          },
          { role: 'user', content: `Tâches à analyser:\n${tasksDescription}` }
        ],
        temperature: 0.4,
        max_tokens: 500,
      })

      const responseText = completion.choices[0]?.message?.content || '[]'
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const updates = JSON.parse(jsonMatch[0])
        return NextResponse.json({ updates })
      }
    } catch (aiError) {
      console.error('AI prioritize error:', aiError)
    }

    return NextResponse.json({ updates: [] })
  } catch (error) {
    console.error('Prioritize error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
