/**
 * Voice Command Dispatcher — Convert parsed intents into dispatchable actions
 */

import { parseVoiceIntent, type VoiceIntent } from './voice-parser'

export type DispatchAction =
  | { type: 'navigate'; tab: string }
  | { type: 'create_task'; title: string }
  | { type: 'create_project'; name: string }
  | { type: 'start_focus'; minutes: number }
  | { type: 'stop_focus' }
  | { type: 'pause_focus' }
  | { type: 'resume_focus' }
  | { type: 'complete_task'; title: string }
  | { type: 'search'; query: string }
  | { type: 'compose_email'; to: string }
  | { type: 'unknown'; raw: string }

const NAVIGATION_MAP: Record<string, string> = {
  open_emails: 'emails',
  open_calendar: 'calendar',
  open_tasks: 'tasks',
  open_invoices: 'invoices',
  open_dashboard: 'dashboard',
}

/**
 * Convert a voice intent into a dispatchable action
 */
export function dispatchVoiceIntent(intent: VoiceIntent): DispatchAction {
  switch (intent.action) {
    case 'create_task':
      return { type: 'create_task', title: intent.params.title || 'Nouvelle tâche' }
    case 'create_project':
      return { type: 'create_project', name: intent.params.name || 'Nouveau projet' }
    case 'start_focus':
      return { type: 'start_focus', minutes: parseInt(intent.params.minutes || '25', 10) }
    case 'stop_focus':
      return { type: 'stop_focus' }
    case 'pause_focus':
      return { type: 'pause_focus' }
    case 'resume_focus':
      return { type: 'resume_focus' }
    case 'complete_task':
      return { type: 'complete_task', title: intent.params.title }
    case 'search':
      return { type: 'search', query: intent.params.query }
    case 'compose_email':
      return { type: 'compose_email', to: intent.params.to }
    default: {
      // Check if it's a navigation action
      const tab = NAVIGATION_MAP[intent.action]
      if (tab) return { type: 'navigate', tab }
      return { type: 'unknown', raw: intent.raw }
    }
  }
}

/**
 * Full pipeline: transcript → intent → action
 */
export function processVoiceCommand(transcript: string): DispatchAction | null {
  const intent = parseVoiceIntent(transcript)
  if (!intent) return null
  return dispatchVoiceIntent(intent)
}
