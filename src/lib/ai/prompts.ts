/**
 * Shared AI Prompts for Burozen
 * Centralises prompt engineering text so that every AI provider
 * (Groq, Z-AI, …) uses exactly the same system/user prompts.
 *
 * Each builder returns a { systemPrompt, userPrompt } tuple.
 */

import type {
  TaskDescription,
  MentalLoadContext,
  CoachingContext,
} from '../ai-engine'

// ─── Helpers ─────────────────────────────────────────────────────────────────────

type Tone = 'pro' | 'friendly' | 'minimal'

/** Map a tone enum to a French descriptive label used inside prompts. */
export function toneLabel(tone: Tone, variant: 'assistant' | 'coach' | 'briefing' = 'assistant'): string {
  if (variant === 'coach') {
    return tone === 'pro'
      ? 'professionnel et structuré'
      : tone === 'friendly'
        ? 'amical, chaleureux et encourageant'
        : 'direct et concis'
  }
  if (variant === 'briefing') {
    return tone === 'pro'
      ? 'professionnel et concis'
      : tone === 'friendly'
        ? 'amical, chaleureux et encourageant'
        : 'minimaliste et direct'
  }
  // default / assistant
  return tone === 'pro'
    ? 'professionnel et concis'
    : tone === 'friendly'
      ? 'amical, chaleureux et encourageant'
      : 'minimaliste et direct'
}

// ─── Prompt pair type ────────────────────────────────────────────────────────────

export interface PromptPair {
  systemPrompt: string
  userPrompt: string
}

// ─── generateSuggestions ─────────────────────────────────────────────────────────

export function buildSuggestionsPrompt(
  context: string,
  userName: string,
  assistantName: string,
  assistantTone: string,
): PromptPair {
  const tone = toneLabel(assistantTone as Tone)
  return {
    systemPrompt:
      `Tu es ${assistantName}, l'assistant IA d'un freelancer nommé ${userName}. Ton ton est ${tone}. ` +
      `Analyse la situation et génère 3-5 suggestions ACTIONABLES et PRIORISÉES. ` +
      `Chaque suggestion doit être concise et spécifique. ` +
      `Réponds en JSON uniquement avec ce format:\n` +
      `[{"icon": "emoji", "title": "titre court", "message": "description actionnable en 1 phrase", "priority": "high|medium|low", "actionUrl": "#tasks|#emails|#invoices|#calendar|#time"}]\n` +
      `Priorise: 1) Urgences (retards) 2) Actions immédiates 3) Optimisations. Réponds en français.`,
    userPrompt: `Voici mon contexte actuel:\n${context}`,
  }
}

// ─── generateEmailDraft ──────────────────────────────────────────────────────────

export function buildEmailDraftPrompt(
  emailContent: string,
  tone: string,
  context: string | undefined,
  userName: string,
  assistantName: string,
  emailSubject?: string,
): PromptPair {
  return {
    systemPrompt:
      `Tu es ${assistantName}, l'assistant de ${userName}, un freelancer. ` +
      `Génère un brouillon de réponse email professionnel. Ton: ${tone}. ` +
      `Sois concis mais poli. Réponds en français. Format JSON: {"subject": "sujet", "body": "corps du message"}`,
    userPrompt: context
      ? `Contexte: ${context}\n\nGénère un email adapté.`
      : `Génère une réponse à cet email:\nSujet: ${emailSubject || ''}\nContenu: ${emailContent.substring(0, 500)}`,
  }
}

// ─── generateBriefing ────────────────────────────────────────────────────────────

export function buildBriefingPrompt(
  context: string,
  userName: string,
  assistantName: string,
  tone: string,
): PromptPair {
  const t = toneLabel(tone as Tone, 'briefing')
  return {
    systemPrompt:
      `Tu es ${assistantName}, l'assistant intelligent de ${userName}. Ton ton est ${t}. ` +
      `Génère un briefing matinal concis et structuré en français. ` +
      `Utilise des émojis pour la lisibilité. Sois encourageant mais factuel.`,
    userPrompt: `Génère mon briefing du jour basé sur: ${context}`,
  }
}

// ─── generateDailySummary ────────────────────────────────────────────────────────

export function buildDailySummaryPrompt(
  context: string,
  userName: string,
  assistantName: string,
): PromptPair {
  return {
    systemPrompt:
      `Tu es ${assistantName}. Génère un résumé de fin de journée encourageant et factuel pour ${userName}. ` +
      `3-4 phrases max. Réponds en français.`,
    userPrompt: `Mon résumé du jour:\n${context}`,
  }
}

// ─── prioritizeTasks ─────────────────────────────────────────────────────────────

function formatTasksForPrompt(tasks: TaskDescription[]): string {
  return tasks
    .map(
      t =>
        `ID:${t.id}|"${t.title}"|Priorité:${t.priority}|Échéance:${t.dueDate || 'N/A'}|Projet:${t.projectName || 'Aucun'}|Catégorie:${t.category || 'N/A'}`,
    )
    .join('\n')
}

export function buildPrioritizeTasksPrompt(tasks: TaskDescription[]): PromptPair {
  return {
    systemPrompt:
      `Tu es un assistant de productivité. Analyse les tâches et suggère une priorisation optimisée. ` +
      `Réponds en JSON: [{"id": "taskId", "suggestedPriority": "urgent|high|medium|low", "reason": "courte raison"}]. ` +
      `Seulement les tâches qui méritent un changement de priorité.`,
    userPrompt: `Tâches à analyser:\n${formatTasksForPrompt(tasks)}`,
  }
}

// ─── analyzeMentalLoad ───────────────────────────────────────────────────────────

export function buildMentalLoadPrompt(context: MentalLoadContext): PromptPair {
  const tone = context.assistantTone === 'pro'
    ? 'professionnel'
    : context.assistantTone === 'friendly'
      ? 'amical et bienveillant'
      : 'direct'

  return {
    systemPrompt:
      `Tu es ${context.assistantName}, l'assistant IA d'un freelancer nommé ${context.userName}. Ton ton est ${tone}.\n\n` +
      `Analyse la charge mentale du freelancer basée sur les données fournies. Calcule un score de 0 à 100 et un niveau (low/moderate/high/critical).\n\n` +
      `Règles de scoring:\n` +
      `- 0-25: low (peu de stress, workload gérable)\n` +
      `- 26-50: moderate (charge normale, quelques points d'attention)\n` +
      `- 51-75: high (charge élevée, risques de surmenage)\n` +
      `- 76-100: critical (charge critique, action urgente nécessaire)\n\n` +
      `Réponds en JSON uniquement:\n` +
      `{\n` +
      `  "score": number,\n` +
      `  "level": "low|moderate|high|critical",\n` +
      `  "factors": [{"name": "nom du facteur", "impact": number 1-10, "suggestion": "conseil actionnable"}],\n` +
      `  "overallAdvice": "conseil global personnalisé en 2-3 phrases"\n` +
      `}\n\n` +
      `Donne 4-6 facteurs. Réponds en français.`,
    userPrompt:
      `Analyse ma charge mentale:\n` +
      `- Tâches en retard: ${context.overdueTasks}\n` +
      `- Tâches dues aujourd'hui: ${context.tasksDueToday}\n` +
      `- Tâches dues cette semaine: ${context.tasksDueThisWeek}\n` +
      `- Emails clients non lus: ${context.unreadClientEmails}\n` +
      `- Factures en retard: ${context.overdueInvoices}\n` +
      `- Deadlines à venir: ${context.upcomingDeadlines}\n` +
      `- Temps tracké vs estimé: ${context.timeTrackedVsEstimated.tracked}h / ${context.timeTrackedVsEstimated.estimated}h\n` +
      `- Projets actifs: ${context.activeProjects}\n` +
      `- Réunions aujourd'hui: ${context.meetingsToday}\n` +
      `- Réunions cette semaine: ${context.meetingsThisWeek}\n` +
      `- Tâches complétées cette semaine: ${context.completedTasksThisWeek}\n` +
      `- Total tâches en attente: ${context.totalPendingTasks}`,
  }
}

// ─── generateCoachingAdvice ──────────────────────────────────────────────────────

export function buildCoachingAdvicePrompt(context: CoachingContext): PromptPair {
  const tone = toneLabel(context.assistantTone as Tone, 'coach')

  return {
    systemPrompt:
      `Tu es ${context.assistantName}, le coach de productivité de ${context.userName}, un freelancer. Ton ton est ${tone}.\n\n` +
      `Génère des conseils de productivité personnalisés basés sur les données du freelancer. ` +
      `Chaque conseil doit être actionnable et spécifique à sa situation.\n\n` +
      `Réponds en JSON uniquement:\n` +
      `{\n` +
      `  "dailyTip": "conseil du jour actionnable en 1-2 phrases",\n` +
      `  "weeklyFocus": "focus prioritaire pour la semaine en 1-2 phrases",\n` +
      `  "habitSuggestion": "une habitude à adopter ou améliorer, spécifique à sa situation",\n` +
      `  "timeOptimization": "suggestion concrète d'optimisation du temps basée sur ses données"\n` +
      `}\n\n` +
      `Réponds en français.`,
    userPrompt:
      `Mes données de productivité:\n` +
      `- Tâches complétées cette semaine: ${context.completedTasksThisWeek}\n` +
      `- Heures travaillées: ${context.totalHoursThisWeek}h (facturables: ${context.billableHoursThisWeek}h)\n` +
      `- Tâches en retard: ${context.overdueTasks}\n` +
      `- Tâches dues aujourd'hui: ${context.tasksDueToday}\n` +
      `- Emails non lus: ${context.unreadEmails}\n` +
      `- Projets actifs: ${context.activeProjects}\n` +
      `- Score de charge mentale: ${context.mentalLoadScore}/100 (${context.mentalLoadLevel})\n` +
      `- Point de douleur principal: ${context.topPainPoint}\n` +
      `- Tendance productivité: ${context.recentProductivityTrend}`,
  }
}
