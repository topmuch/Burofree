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
import {
  buildSuggestionsPrompt,
  buildEmailDraftPrompt,
  buildBriefingPrompt,
  buildDailySummaryPrompt,
  buildPrioritizeTasksPrompt,
  buildMentalLoadPrompt,
  buildCoachingAdvicePrompt,
} from './prompts'

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
    const { systemPrompt, userPrompt } = buildSuggestionsPrompt(context, userName, assistantName, assistantTone)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
    const { systemPrompt, userPrompt } = buildEmailDraftPrompt(emailContent, tone, context, userName, assistantName, emailSubject)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
    const { systemPrompt, userPrompt } = buildBriefingPrompt(context, userName, assistantName, tone)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.6, maxTokens: 400 }))
    return result.content
  }

  async generateDailySummary(
    context: string,
    userName: string,
    assistantName: string,
  ): Promise<string> {
    const { systemPrompt, userPrompt } = buildDailySummaryPrompt(context, userName, assistantName)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.6, maxTokens: 200 }))
    return result.content
  }

  async prioritizeTasks(tasks: TaskDescription[]): Promise<PrioritizationResult[]> {
    const { systemPrompt, userPrompt } = buildPrioritizeTasksPrompt(tasks)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const result = await withRetry(() => this.callGroq(messages, { temperature: 0.4, maxTokens: 500 }))
    const parsed = extractJSON<PrioritizationResult[]>(result.content)
    return parsed || []
  }

  async analyzeMentalLoad(context: MentalLoadContext): Promise<MentalLoadAnalysis> {
    const { systemPrompt, userPrompt } = buildMentalLoadPrompt(context)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
    const { systemPrompt, userPrompt } = buildCoachingAdvicePrompt(context)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
