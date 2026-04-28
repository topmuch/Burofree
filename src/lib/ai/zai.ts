/**
 * Z-AI (z-ai-web-dev-sdk) Fallback Provider for Burozen
 * Wraps the existing z-ai-web-dev-sdk into the unified AIEngine interface
 */

import ZAI from 'z-ai-web-dev-sdk'
import {
  AIEngine,
  ChatMessage,
  ChatOptions,
  AISuggestion,
  EmailDraft,
  TaskDescription,
  PrioritizationResult,
  MentalLoadAnalysis,
  MentalLoadContext,
  CoachingAdvice,
  CoachingContext,
  TokenUsage,
  trackTokenUsage,
  extractJSON,
  withRetry,
  calculateZAICost,
} from '../ai-engine'

export class ZAIEngine implements AIEngine {
  readonly providerName = 'z-ai'

  private async callZAI(messages: ChatMessage[], options?: ChatOptions): Promise<{ content: string; usage: TokenUsage }> {
    const zai = await ZAI.create()
    const temperature = options?.temperature ?? 0.7
    const maxTokens = options?.maxTokens ?? 500

    const completion = await zai.chat.completions.create({
      messages,
      temperature,
      max_tokens: maxTokens,
    })

    const content = completion.choices[0]?.message?.content || ''

    // z-ai doesn't provide token counts, estimate roughly
    const promptTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
    const completionTokens = Math.ceil(content.length / 4)
    const cost = calculateZAICost(promptTokens, completionTokens)

    const usage: TokenUsage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      provider: 'z-ai',
      model: 'z-ai-default',
      timestamp: new Date(),
    }

    trackTokenUsage(usage)

    return { content, usage }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const result = await withRetry(() => this.callZAI(messages, options))
    return result.content
  }

  async generateSuggestions(
    context: string,
    userName: string,
    assistantName: string,
    assistantTone: string,
  ): Promise<AISuggestion[]> {
    const toneLabel = assistantTone === 'pro' ? 'professionnel et concis' : assistantTone === 'friendly' ? 'amical, chaleureux et encourageant' : 'minimaliste et direct'

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es ${assistantName}, l'assistant IA d'un freelancer nommé ${userName}. Ton ton est ${toneLabel}. Analyse la situation et génère 3-5 suggestions ACTIONABLES et PRIORISÉES. Chaque suggestion doit être concise et spécifique. Réponds en JSON uniquement avec ce format:
[{"icon": "emoji", "title": "titre court", "message": "description actionnable en 1 phrase", "priority": "high|medium|low", "actionUrl": "#tasks|#emails|#invoices|#calendar|#time"}]
Priorise: 1) Urgences (retards) 2) Actions immédiates 3) Optimisations. Réponds en français.`
      },
      { role: 'user', content: `Voici mon contexte actuel:\n${context}` }
    ]

    try {
      const result = await this.callZAI(messages, { temperature: 0.6, maxTokens: 600 })
      const parsed = extractJSON<AISuggestion[]>(result.content)
      return parsed || []
    } catch {
      return []
    }
  }

  async generateEmailDraft(
    emailContent: string,
    tone: string,
    context: string | undefined,
    userName: string,
    assistantName: string,
    emailSubject?: string,
  ): Promise<EmailDraft> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es ${assistantName}, l'assistant de ${userName}, un freelancer. Génère un brouillon de réponse email professionnel. Ton: ${tone}. Sois concis mais poli. Réponds en français. Format JSON: {"subject": "sujet", "body": "corps du message"}`
      },
      {
        role: 'user',
        content: context
          ? `Contexte: ${context}\n\nGénère un email adapté.`
          : `Génère une réponse à cet email:\nSujet: ${emailSubject || ''}\nContenu: ${emailContent.substring(0, 500)}`
      }
    ]

    const result = await this.callZAI(messages, { temperature: 0.7, maxTokens: 400 })
    const parsed = extractJSON<EmailDraft>(result.content)
    return parsed || { subject: 'Re: ' + (emailSubject || ''), body: result.content }
  }

  async generateBriefing(
    context: string,
    userName: string,
    assistantName: string,
    tone: string,
  ): Promise<string> {
    const toneLabel = tone === 'pro' ? 'professionnel et concis' : tone === 'friendly' ? 'amical, chaleureux et encourageant' : 'minimaliste et direct'

    const messages: ChatMessage[] = [
      { role: 'system', content: `Tu es ${assistantName}, l'assistant intelligent de ${userName}. Ton ton est ${toneLabel}. Génère un briefing matinal concis et structuré en français. Utilise des émojis pour la lisibilité. Sois encourageant mais factuel.` },
      { role: 'user', content: `Génère mon briefing du jour basé sur: ${context}` },
    ]

    const result = await this.callZAI(messages, { temperature: 0.6, maxTokens: 400 })
    return result.content
  }

  async generateDailySummary(
    context: string,
    userName: string,
    assistantName: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: `Tu es ${assistantName}. Génère un résumé de fin de journée encourageant et factuel pour ${userName}. 3-4 phrases max. Réponds en français.` },
      { role: 'user', content: `Mon résumé du jour:\n${context}` }
    ]

    const result = await this.callZAI(messages, { temperature: 0.6, maxTokens: 200 })
    return result.content
  }

  async prioritizeTasks(tasks: TaskDescription[]): Promise<PrioritizationResult[]> {
    const tasksDescription = tasks.map(t =>
      `ID:${t.id}|"${t.title}"|Priorité:${t.priority}|Échéance:${t.dueDate || 'N/A'}|Projet:${t.projectName || 'Aucun'}|Catégorie:${t.category || 'N/A'}`
    ).join('\n')

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es un assistant de productivité. Analyse les tâches et suggère une priorisation optimisée. Réponds en JSON: [{"id": "taskId", "suggestedPriority": "urgent|high|medium|low", "reason": "courte raison"}]. Seulement les tâches qui méritent un changement de priorité.`
      },
      { role: 'user', content: `Tâches à analyser:\n${tasksDescription}` }
    ]

    try {
      const result = await this.callZAI(messages, { temperature: 0.4, maxTokens: 500 })
      const parsed = extractJSON<PrioritizationResult[]>(result.content)
      return parsed || []
    } catch {
      return []
    }
  }

  async analyzeMentalLoad(context: MentalLoadContext): Promise<MentalLoadAnalysis> {
    const toneLabel = context.assistantTone === 'pro' ? 'professionnel' : context.assistantTone === 'friendly' ? 'amical et bienveillant' : 'direct'

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es ${context.assistantName}, l'assistant IA d'un freelancer nommé ${context.userName}. Ton ton est ${toneLabel}.

Analyse la charge mentale du freelancer. Réponds en JSON:
{
  "score": number (0-100),
  "level": "low|moderate|high|critical",
  "factors": [{"name": "nom", "impact": number 1-10, "suggestion": "conseil actionnable"}],
  "overallAdvice": "conseil global en 2-3 phrases"
}

Scoring: 0-25=low, 26-50=moderate, 51-75=high, 76-100=critical. Donne 4-6 facteurs. Réponds en français.`
      },
      {
        role: 'user',
        content: `Analyse ma charge mentale:
- Tâches en retard: ${context.overdueTasks}
- Tâches dues aujourd'hui: ${context.tasksDueToday}
- Tâches dues cette semaine: ${context.tasksDueThisWeek}
- Emails clients non lus: ${context.unreadClientEmails}
- Factures en retard: ${context.overdueInvoices}
- Deadlines à venir: ${context.upcomingDeadlines}
- Temps tracké vs estimé: ${context.timeTrackedVsEstimated.tracked}h / ${context.timeTrackedVsEstimated.estimated}h
- Projets actifs: ${context.activeProjects}
- Réunions aujourd'hui: ${context.meetingsToday}
- Réunions cette semaine: ${context.meetingsThisWeek}
- Tâches complétées cette semaine: ${context.completedTasksThisWeek}
- Total tâches en attente: ${context.totalPendingTasks}`
      }
    ]

    try {
      const result = await this.callZAI(messages, { temperature: 0.5, maxTokens: 600 })
      const parsed = extractJSON<MentalLoadAnalysis>(result.content)
      if (parsed && typeof parsed.score === 'number' && parsed.level && parsed.factors) {
        return parsed
      }
    } catch (error) {
      console.error('Z-AI mental load analysis error:', error)
    }

    // Fallback to rule-based
    return this.calculateMentalLoadFallback(context)
  }

  async generateCoachingAdvice(context: CoachingContext): Promise<CoachingAdvice> {
    const toneLabel = context.assistantTone === 'pro' ? 'professionnel et structuré' : context.assistantTone === 'friendly' ? 'amical, chaleureux et encourageant' : 'direct et concis'

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es ${context.assistantName}, le coach de productivité de ${context.userName}. Ton ton est ${toneLabel}.

Génère des conseils personnalisés. Réponds en JSON:
{
  "dailyTip": "conseil du jour en 1-2 phrases",
  "weeklyFocus": "focus prioritaire pour la semaine en 1-2 phrases",
  "habitSuggestion": "une habitude à adopter ou améliorer",
  "timeOptimization": "suggestion concrète d'optimisation du temps"
}
Réponds en français.`
      },
      {
        role: 'user',
        content: `Mes données de productivité:
- Tâches complétées cette semaine: ${context.completedTasksThisWeek}
- Heures travaillées: ${context.totalHoursThisWeek}h (facturables: ${context.billableHoursThisWeek}h)
- Tâches en retard: ${context.overdueTasks}
- Tâches dues aujourd'hui: ${context.tasksDueToday}
- Emails non lus: ${context.unreadEmails}
- Projets actifs: ${context.activeProjects}
- Score de charge mentale: ${context.mentalLoadScore}/100 (${context.mentalLoadLevel})
- Point de douleur principal: ${context.topPainPoint}
- Tendance productivité: ${context.recentProductivityTrend}`
      }
    ]

    try {
      const result = await this.callZAI(messages, { temperature: 0.6, maxTokens: 500 })
      const parsed = extractJSON<CoachingAdvice>(result.content)
      if (parsed && parsed.dailyTip && parsed.weeklyFocus) {
        return parsed
      }
    } catch (error) {
      console.error('Z-AI coaching advice error:', error)
    }

    // Fallback to rule-based
    return this.generateCoachingFallback(context)
  }

  getTokenUsage(): TokenUsage[] {
    return []
  }

  // ─── Fallback: Rule-based mental load (same as Groq fallback) ─────────────

  private calculateMentalLoadFallback(ctx: MentalLoadContext): MentalLoadAnalysis {
    let score = 0
    const factors: MentalLoadAnalysis['factors'] = []

    if (ctx.overdueTasks > 0) {
      const impact = Math.min(ctx.overdueTasks * 5, 25)
      score += impact
      factors.push({ name: 'Tâches en retard', impact: Math.min(impact, 10), suggestion: 'Priorisez les tâches en retard immédiatement.' })
    }
    if (ctx.tasksDueToday > 3) {
      const impact = Math.min((ctx.tasksDueToday - 3) * 3, 15)
      score += impact
      factors.push({ name: 'Tâches dues aujourd\'hui', impact: Math.min(impact, 10), suggestion: 'Réévaluez les priorités du jour.' })
    }
    if (ctx.unreadClientEmails > 5) {
      const impact = Math.min((ctx.unreadClientEmails - 5) * 2, 15)
      score += impact
      factors.push({ name: 'Emails clients non lus', impact: Math.min(impact, 10), suggestion: 'Bloquez 30 min pour traiter les emails urgents.' })
    }
    if (ctx.overdueInvoices > 0) {
      const impact = Math.min(ctx.overdueInvoices * 10, 20)
      score += impact
      factors.push({ name: 'Factures en retard', impact: Math.min(impact, 10), suggestion: 'Envoyez des relances de paiement.' })
    }
    if (ctx.activeProjects > 4) {
      const impact = Math.min((ctx.activeProjects - 4) * 3, 10)
      score += impact
      factors.push({ name: 'Projets actifs', impact: Math.min(impact, 8), suggestion: 'Envisagez de limiter le nombre de projets actifs.' })
    }

    score = Math.min(score, 100)

    let level: MentalLoadAnalysis['level']
    if (score <= 25) level = 'low'
    else if (score <= 50) level = 'moderate'
    else if (score <= 75) level = 'high'
    else level = 'critical'

    return {
      score,
      level,
      factors,
      overallAdvice: `Charge mentale ${level} (${score}/100). ${score > 50 ? 'Prenez des mesures pour réduire votre charge.' : 'Votre charge est gérable, continuez ainsi.'}`,
    }
  }

  // ─── Fallback: Rule-based coaching ─────────────────────────────────────────

  private generateCoachingFallback(ctx: CoachingContext): CoachingAdvice {
    return {
      dailyTip: ctx.overdueTasks > 3
        ? 'Concentrez-vous sur les tâches en retard. Commencez par la plus rapide.'
        : 'Commencez par la tâche la plus importante de la journée.',
      weeklyFocus: ctx.mentalLoadScore > 60
        ? 'Réduisez votre charge mentale en déléguant et en disant non aux nouvelles sollicitations.'
        : 'Avancez sur vos projets prioritaires cette semaine.',
      habitSuggestion: 'Planifiez 2h de travail en profondeur sans interruption chaque matin.',
      timeOptimization: ctx.billableHoursThisWeek / Math.max(ctx.totalHoursThisWeek, 1) < 0.6
        ? 'Augmentez votre ratio d\'heures facturables en réduisant les tâches administratives.'
        : 'Regroupez vos tâches similaires en blocs de temps.',
    }
  }
}
