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
import {
  buildSuggestionsPrompt,
  buildEmailDraftPrompt,
  buildBriefingPrompt,
  buildDailySummaryPrompt,
  buildPrioritizeTasksPrompt,
  buildMentalLoadPrompt,
  buildCoachingAdvicePrompt,
} from './prompts'

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
    const { systemPrompt, userPrompt } = buildSuggestionsPrompt(context, userName, assistantName, assistantTone)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
    const { systemPrompt, userPrompt } = buildEmailDraftPrompt(emailContent, tone, context, userName, assistantName, emailSubject)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
    const { systemPrompt, userPrompt } = buildBriefingPrompt(context, userName, assistantName, tone)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const result = await this.callZAI(messages, { temperature: 0.6, maxTokens: 400 })
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

    const result = await this.callZAI(messages, { temperature: 0.6, maxTokens: 200 })
    return result.content
  }

  async prioritizeTasks(tasks: TaskDescription[]): Promise<PrioritizationResult[]> {
    const { systemPrompt, userPrompt } = buildPrioritizeTasksPrompt(tasks)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
    const { systemPrompt, userPrompt } = buildMentalLoadPrompt(context)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
    const { systemPrompt, userPrompt } = buildCoachingAdvicePrompt(context)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
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
