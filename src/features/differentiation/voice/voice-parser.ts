/**
 * Voice Intent Parser — Parse French voice transcripts into structured intents
 */

export interface VoiceIntent {
  action: string
  params: Record<string, string>
  confidence: number
  raw: string
}

// Intent rules: regex patterns mapped to actions
const INTENT_RULES: Array<{
  pattern: RegExp
  action: string
  paramExtractors: Record<string, (match: RegExpMatchArray) => string>
}> = [
  {
    pattern: /crée?\s+(?:une\s+)?tâche\s+(.+)/i,
    action: 'create_task',
    paramExtractors: { title: (m) => m[1]?.trim() || '' },
  },
  {
    pattern: /crée?\s+(?:un\s+)?(?:projet|nouveau\s+projet)\s+(.+)/i,
    action: 'create_project',
    paramExtractors: { name: (m) => m[1]?.trim() || '' },
  },
  {
    pattern: /ouvre?\s+(?:les?\s+)?emails?/i,
    action: 'open_emails',
    paramExtractors: {},
  },
  {
    pattern: /ouvre?\s+(?:le\s+)?calendrier/i,
    action: 'open_calendar',
    paramExtractors: {},
  },
  {
    pattern: /ouvre?\s+(?:les?\s+)?tâches?/i,
    action: 'open_tasks',
    paramExtractors: {},
  },
  {
    pattern: /ouvre?\s+(?:les?\s+)?factures?/i,
    action: 'open_invoices',
    paramExtractors: {},
  },
  {
    pattern: /ouvre?\s+(?:le\s+)?tableau\s+de\s+bord/i,
    action: 'open_dashboard',
    paramExtractors: {},
  },
  {
    pattern: /lance?\s+(?:le\s+)?focus\s+(\d+)\s*min/i,
    action: 'start_focus',
    paramExtractors: { minutes: (m) => m[1] || '25' },
  },
  {
    pattern: /lance?\s+(?:le\s+)?focus/i,
    action: 'start_focus',
    paramExtractors: { minutes: () => '25' },
  },
  {
    pattern: /arrête?\s+(?:le\s+)?focus/i,
    action: 'stop_focus',
    paramExtractors: {},
  },
  {
    pattern: /pause/i,
    action: 'pause_focus',
    paramExtractors: {},
  },
  {
    pattern: /reprends?/i,
    action: 'resume_focus',
    paramExtractors: {},
  },
  {
    pattern: /marque?\s+(.+)\s+(?:comme\s+)?(?:fait|terminé|complété)/i,
    action: 'complete_task',
    paramExtractors: { title: (m) => m[1]?.trim() || '' },
  },
  {
    pattern: /cherche?\s+(.+)/i,
    action: 'search',
    paramExtractors: { query: (m) => m[1]?.trim() || '' },
  },
  {
    pattern: /envoie?\s+(?:un\s+)?email\s+(?:à\s+)?(.+)/i,
    action: 'compose_email',
    paramExtractors: { to: (m) => m[1]?.trim() || '' },
  },
]

/**
 * Parse a voice transcript into a structured intent
 */
export function parseVoiceIntent(transcript: string): VoiceIntent | null {
  const trimmed = transcript.trim()
  if (!trimmed) return null

  for (const rule of INTENT_RULES) {
    const match = trimmed.match(rule.pattern)
    if (match) {
      const params: Record<string, string> = {}
      for (const [key, extractor] of Object.entries(rule.paramExtractors)) {
        params[key] = extractor(match)
      }
      return {
        action: rule.action,
        params,
        confidence: Math.min(1, match[0].length / trimmed.length + 0.5),
        raw: trimmed,
      }
    }
  }

  return null
}

/**
 * Get all available voice commands for help display
 */
export function getVoiceCommands(): Array<{ phrase: string; description: string }> {
  return [
    { phrase: 'Crée tâche [titre]', description: 'Créer une nouvelle tâche' },
    { phrase: 'Crée projet [nom]', description: 'Créer un nouveau projet' },
    { phrase: 'Ouvre emails', description: 'Ouvrir la boîte mail' },
    { phrase: 'Ouvre calendrier', description: 'Ouvrir le calendrier' },
    { phrase: 'Ouvre tâches', description: 'Ouvrir les tâches' },
    { phrase: 'Ouvre factures', description: 'Ouvrir les factures' },
    { phrase: 'Ouvre tableau de bord', description: 'Ouvrir le dashboard' },
    { phrase: 'Lance focus 25 min', description: 'Démarrer un focus Pomodoro' },
    { phrase: 'Lance focus', description: 'Démarrer un focus (25 min par défaut)' },
    { phrase: 'Arrête focus', description: 'Arrêter le mode focus' },
    { phrase: 'Pause', description: 'Mettre en pause le focus' },
    { phrase: 'Reprends', description: 'Reprendre le focus' },
    { phrase: 'Marque [tâche] comme fait', description: 'Compléter une tâche' },
    { phrase: 'Cherche [terme]', description: 'Rechercher' },
    { phrase: 'Envoie email à [contact]', description: 'Composer un email' },
  ]
}
