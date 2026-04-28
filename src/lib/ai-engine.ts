/**
 * AI Engine Abstraction Layer for Burozen
 * Unified interface supporting multiple AI providers (Groq, z-ai-web-dev-sdk)
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface AISuggestion {
  icon: string
  title: string
  message: string
  priority: string
  actionUrl: string
}

export interface EmailDraft {
  subject: string
  body: string
}

export interface TaskDescription {
  id: string
  title: string
  priority: string
  dueDate: string | null
  projectName: string | null
  category: string | null
}

export interface PrioritizationResult {
  id: string
  suggestedPriority: string
  reason: string
}

export interface MentalLoadFactor {
  name: string
  impact: number
  suggestion: string
}

export interface MentalLoadAnalysis {
  score: number // 0-100
  level: 'low' | 'moderate' | 'high' | 'critical'
  factors: MentalLoadFactor[]
  overallAdvice: string
}

export interface MentalLoadContext {
  overdueTasks: number
  tasksDueToday: number
  tasksDueThisWeek: number
  unreadClientEmails: number
  overdueInvoices: number
  upcomingDeadlines: number
  timeTrackedVsEstimated: { tracked: number; estimated: number }
  activeProjects: number
  meetingsToday: number
  meetingsThisWeek: number
  completedTasksThisWeek: number
  totalPendingTasks: number
  userName: string
  assistantName: string
  assistantTone: string
}

export interface CoachingAdvice {
  dailyTip: string
  weeklyFocus: string
  habitSuggestion: string
  timeOptimization: string
}

export interface CoachingContext {
  userName: string
  assistantName: string
  assistantTone: string
  completedTasksThisWeek: number
  totalHoursThisWeek: number
  billableHoursThisWeek: number
  overdueTasks: number
  tasksDueToday: number
  unreadEmails: number
  activeProjects: number
  mentalLoadScore: number
  mentalLoadLevel: string
  topPainPoint: string
  recentProductivityTrend: 'improving' | 'stable' | 'declining'
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  provider: string
  model: string
  timestamp: Date
}

// ─── Engine Interface ────────────────────────────────────────────────────────────

export interface AIEngine {
  readonly providerName: string

  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>
  generateSuggestions(context: string, userName: string, assistantName: string, assistantTone: string): Promise<AISuggestion[]>
  generateEmailDraft(emailContent: string, tone: string, context: string | undefined, userName: string, assistantName: string, emailSubject?: string): Promise<EmailDraft>
  generateBriefing(context: string, userName: string, assistantName: string, tone: string): Promise<string>
  generateDailySummary(context: string, userName: string, assistantName: string): Promise<string>
  prioritizeTasks(tasks: TaskDescription[]): Promise<PrioritizationResult[]>
  analyzeMentalLoad(context: MentalLoadContext): Promise<MentalLoadAnalysis>
  generateCoachingAdvice(context: CoachingContext): Promise<CoachingAdvice>
  getTokenUsage(): TokenUsage[]
}

// ─── Token Usage Tracker ─────────────────────────────────────────────────────────

const tokenUsageHistory: TokenUsage[] = []

export function trackTokenUsage(usage: TokenUsage): void {
  tokenUsageHistory.push(usage)
  // Keep last 1000 entries
  if (tokenUsageHistory.length > 1000) {
    tokenUsageHistory.shift()
  }
}

export function getTokenUsageHistory(): TokenUsage[] {
  return [...tokenUsageHistory]
}

export function clearTokenUsageHistory(): void {
  tokenUsageHistory.length = 0
}

// ─── Helper: JSON extraction from AI response ────────────────────────────────────

export function extractJSON<T>(text: string): T | null {
  // Try array first
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T
    } catch {
      // fall through
    }
  }
  // Try object
  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as T
    } catch {
      // fall through
    }
  }
  return null
}

// ─── Helper: Retry with fallback ─────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastError!
}

// ─── Groq Pricing (approximate) ──────────────────────────────────────────────────

const GROQ_PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
  'llama-3.1-8b-instant': { input: 0.05 / 1_000_000, output: 0.08 / 1_000_000 },
  'mixtral-8x7b-32768': { input: 0.27 / 1_000_000, output: 0.27 / 1_000_000 },
}

export function calculateGroqCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = GROQ_PRICING[model] || GROQ_PRICING['llama-3.3-70b-versatile']
  return (promptTokens * pricing.input) + (completionTokens * pricing.output)
}

// z-ai pricing: estimate as $0 per token (internal SDK)
export function calculateZAICost(_promptTokens: number, _completionTokens: number): number {
  return 0
}
