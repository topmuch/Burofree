/**
 * Groq AI Provider for Burozen
 * Uses Groq API with Llama 3 models for fast, capable AI responses
 */

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
  calculateGroqCost,
} from '../ai-engine'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

interface GroqResponse {
  choices: Array<{
    message: { content: string }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class GroqAIEngine implements AIEngine {
  readonly providerName = 'groq'
  private apiKey: string
  private defaultModel: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || ''
    this.defaultModel = model || DEFAULT_MODEL
  }

  private async callGroq(messages: ChatMessage[], options?: ChatOptions): Promise<{ content: string; usage: TokenUsage }> {
    const model = options?.model || this.defaultModel
    const temperature = options?.temperature ?? 0.7
    const maxTokens = options?.maxTokens ?? 500

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Groq API error ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as GroqResponse
    const content = data.choices[0]?.message?.content || ''

    const promptTokens = data.usage?.prompt_tokens || 0
    const completionTokens = data.usage?.completion_tokens || 0
    const cost = calculateGroqCost(model, promptTokens, completionTokens)

    const usage: TokenUsage = {
      promptTokens,
      completionTokens,
      totalTokens: data.usage?.total_tokens || promptTokens + completionTokens,
      cost,
      provider: 'groq',
      model,
      timestamp: new Date(),
    }

    trackTokenUsage(usage)

    return { content, usage }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const result = await withRetry(() => this.callGroq(messages, options))
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

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.6, maxTokens: 600 }))
    const parsed = extractJSON<AISuggestion[]>(result.content)
    return parsed || []
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

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.7, maxTokens: 400 }))
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

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.6, maxTokens: 400 }))
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

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.6, maxTokens: 200 }))
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

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.4, maxTokens: 500 }))
    const parsed = extractJSON<PrioritizationResult[]>(result.content)
    return parsed || []
  }

  async analyzeMentalLoad(context: MentalLoadContext): Promise<MentalLoadAnalysis> {
    const toneLabel = context.assistantTone === 'pro' ? 'professionnel' : context.assistantTone === 'friendly' ? 'amical et bienveillant' : 'direct'

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es ${context.assistantName}, l'assistant IA d'un freelancer nommé ${context.userName}. Ton ton est ${toneLabel}.

Analyse la charge mentale du freelancer basée sur les données fournies. Calcule un score de 0 à 100 et un niveau (low/moderate/high/critical).

Règles de scoring:
- 0-25: low (peu de stress, workload gérable)
- 26-50: moderate (charge normale, quelques points d'attention)
- 51-75: high (charge élevée, risques de surmenage)
- 76-100: critical (charge critique, action urgente nécessaire)

Réponds en JSON uniquement:
{
  "score": number,
  "level": "low|moderate|high|critical",
  "factors": [{"name": "nom du facteur", "impact": number 1-10, "suggestion": "conseil actionnable"}],
  "overallAdvice": "conseil global personnalisé en 2-3 phrases"
}

Donne 4-6 facteurs. Réponds en français.`
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
      const result = await withRetry(() => this.callGroq(messages, { temperature: 0.5, maxTokens: 600 }))
      const parsed = extractJSON<MentalLoadAnalysis>(result.content)
      if (parsed && typeof parsed.score === 'number' && parsed.level && parsed.factors) {
        return parsed
      }
    } catch (error) {
      console.error('Groq mental load analysis error:', error)
    }

    // Fallback: rule-based calculation
    return this.calculateMentalLoadFallback(context)
  }

  async generateCoachingAdvice(context: CoachingContext): Promise<CoachingAdvice> {
    const toneLabel = context.assistantTone === 'pro' ? 'professionnel et structuré' : context.assistantTone === 'friendly' ? 'amical, chaleureux et encourageant' : 'direct et concis'

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Tu es ${context.assistantName}, le coach de productivité de ${context.userName}, un freelancer. Ton ton est ${toneLabel}.

Génère des conseils de productivité personnalisés basés sur les données du freelancer. Chaque conseil doit être actionnable et spécifique à sa situation.

Réponds en JSON uniquement:
{
  "dailyTip": "conseil du jour actionnable en 1-2 phrases",
  "weeklyFocus": "focus prioritaire pour la semaine en 1-2 phrases",
  "habitSuggestion": "une habitude à adopter ou améliorer, spécifique à sa situation",
  "timeOptimization": "suggestion concrète d'optimisation du temps basée sur ses données"
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
      const result = await withRetry(() => this.callGroq(messages, { temperature: 0.6, maxTokens: 500 }))
      const parsed = extractJSON<CoachingAdvice>(result.content)
      if (parsed && parsed.dailyTip && parsed.weeklyFocus) {
        return parsed
      }
    } catch (error) {
      console.error('Groq coaching advice error:', error)
    }

    // Fallback: rule-based coaching
    return this.generateCoachingFallback(context)
  }

  getTokenUsage(): TokenUsage[] {
    return []
  }

  // ─── Fallback: Rule-based mental load ──────────────────────────────────────

  private calculateMentalLoadFallback(ctx: MentalLoadContext): MentalLoadAnalysis {
    let score = 0
    const factors: MentalLoadAnalysis['factors'] = []

    // Overdue tasks: 0-25 points
    if (ctx.overdueTasks > 0) {
      const impact = Math.min(ctx.overdueTasks * 5, 25)
      score += impact
      factors.push({ name: 'Tâches en retard', impact: Math.min(impact, 10), suggestion: 'Priorisez les tâches en retard immédiatement. Bloquez du temps focus pour les traiter.' })
    }

    // Tasks due today: 0-15 points
    if (ctx.tasksDueToday > 3) {
      const impact = Math.min((ctx.tasksDueToday - 3) * 3, 15)
      score += impact
      factors.push({ name: 'Tâches dues aujourd\'hui', impact: Math.min(impact, 10), suggestion: 'Réévaluez les priorités. Certaines tâches peuvent-elles être déléguées ou reportées ?' })
    }

    // Unread client emails: 0-15 points
    if (ctx.unreadClientEmails > 5) {
      const impact = Math.min((ctx.unreadClientEmails - 5) * 2, 15)
      score += impact
      factors.push({ name: 'Emails clients non lus', impact: Math.min(impact, 10), suggestion: 'Bloquez 30 min pour traiter les emails clients les plus urgents.' })
    }

    // Overdue invoices: 0-20 points
    if (ctx.overdueInvoices > 0) {
      const impact = Math.min(ctx.overdueInvoices * 10, 20)
      score += impact
      factors.push({ name: 'Factures en retard', impact: Math.min(impact, 10), suggestion: 'Envoyez des relances de paiement. Le flux de trésorerie est crucial.' })
    }

    // Active projects: 0-10 points
    if (ctx.activeProjects > 4) {
      const impact = Math.min((ctx.activeProjects - 4) * 3, 10)
      score += impact
      factors.push({ name: 'Projets actifs', impact: Math.min(impact, 8), suggestion: 'Envisagez de clôturer ou mettre en pause un projet avant d\'en commencer un nouveau.' })
    }

    // Meeting density: 0-10 points
    if (ctx.meetingsToday > 3) {
      const impact = Math.min((ctx.meetingsToday - 3) * 3, 10)
      score += impact
      factors.push({ name: 'Densité de réunions', impact: Math.min(impact, 8), suggestion: 'Bloquez des créneaux sans réunion pour le travail en profondeur.' })
    }

    // Time tracking gap: 0-5 points
    if (ctx.timeTrackedVsEstimated.estimated > 0) {
      const ratio = ctx.timeTrackedVsEstimated.tracked / ctx.timeTrackedVsEstimated.estimated
      if (ratio > 1.2) {
        score += 5
        factors.push({ name: 'Dépassement de temps', impact: 7, suggestion: 'Vous dépassez les estimations. Réajustez vos prévisions ou cherchez des blocages.' })
      }
    }

    score = Math.min(score, 100)

    let level: MentalLoadAnalysis['level']
    if (score <= 25) level = 'low'
    else if (score <= 50) level = 'moderate'
    else if (score <= 75) level = 'high'
    else level = 'critical'

    const levelLabels = { low: 'faible', moderate: 'modérée', high: 'élevée', critical: 'critique' }
    const overallAdvice = score <= 25
      ? 'Votre charge mentale est gérable. Profitez de ce rythme pour avancer sur vos projets prioritaires.'
      : score <= 50
        ? 'Votre charge est modérée. Gardez le cap et n\'hésitez pas à déléguer si possible.'
        : score <= 75
          ? 'Votre charge est élevée. Il est important de prioriser et de vous accorder des pauses pour éviter le surmenage.'
          : 'Votre charge est critique ! Prenez des mesures immédiates : repoussez les non-urgents, déléguez, et protégez votre santé.'

    return {
      score,
      level,
      factors,
      overallAdvice: `Charge mentale ${levelLabels[level]} (${score}/100). ${overallAdvice}`,
    }
  }

  // ─── Fallback: Rule-based coaching ─────────────────────────────────────────

  private generateCoachingFallback(ctx: CoachingContext): CoachingAdvice {
    let dailyTip = 'Commencez votre journée par la tâche la plus importante. La règle du "manger la grenouille" fonctionne !'
    let weeklyFocus = 'Concentrez-vous sur l\'avancement de vos projets les plus importants.'
    let habitSuggestion = 'Planifiez 2h de travail en profondeur sans interruption chaque matin.'
    let timeOptimization = 'Regroupez vos tâches similaires en blocs de temps pour gagner en efficacité.'

    if (ctx.overdueTasks > 3) {
      dailyTip = 'Aujourd\'hui, consacrez 1h exclusivement aux tâches en retard. Commencez par la plus rapide pour créer de l\'élan.'
      weeklyFocus = 'Cette semaine, l\'objectif est de réduire votre backlog. Visez 0 tâche en retard d\'ici vendredi.'
    }

    if (ctx.mentalLoadScore > 60) {
      habitSuggestion = 'Pratiquez la technique Pomodoro : 25 min de focus, 5 min de pause. Ça aide à gérer la pression.'
    }

    if (ctx.totalHoursThisWeek > 45) {
      timeOptimization = 'Vous travaillez beaucoup. Identifiez les tâches à faible valeur ajoutée et envisagez de les automatiser ou déléguer.'
    } else if (ctx.billableHoursThisWeek / Math.max(ctx.totalHoursThisWeek, 1) < 0.6) {
      timeOptimization = `Seulement ${Math.round((ctx.billableHoursThisWeek / Math.max(ctx.totalHoursThisWeek, 1)) * 100)}% de votre temps est facturable. Identifiez et réduisez les activités non facturables.`
    }

    if (ctx.recentProductivityTrend === 'declining') {
      weeklyFocus = 'Votre productivité baisse. Prenez du repos, repriorisez, et fixez-vous 3 objectifs max par jour.'
    }

    if (ctx.unreadEmails > 10) {
      dailyTip = 'Traitez vos emails par lots (batching) plutôt qu\'au fil de l\'eau. 3 créneaux de 15 min suffisent.'
    }

    return { dailyTip, weeklyFocus, habitSuggestion, timeOptimization }
  }
}
