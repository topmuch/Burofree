/**
 * AI Engine Factory for Burozen
 * Selects the appropriate AI provider based on environment configuration
 * Supports Groq (primary) and z-ai-web-dev-sdk (fallback)
 */

import { AIEngine } from '../ai-engine'
import { GroqAIEngine } from './groq'
import { ZAIEngine } from './zai'

let engineInstance: AIEngine | null = null

/**
 * Create the appropriate AI engine based on available environment variables.
 * - If GROQ_API_KEY is set, uses Groq (fast, Llama 3 models)
 * - Otherwise, falls back to z-ai-web-dev-sdk
 */
export function createAIEngine(): AIEngine {
  if (engineInstance) return engineInstance

  const groqApiKey = process.env.GROQ_API_KEY

  if (groqApiKey && groqApiKey.trim().length > 0) {
    console.log('[AI Engine] Using Groq provider (primary)')
    engineInstance = new GroqAIEngine(groqApiKey)
  } else {
    console.log('[AI Engine] Using Z-AI provider (fallback)')
    engineInstance = new ZAIEngine()
  }

  return engineInstance
}

/**
 * Reset the engine instance (useful for testing or when env changes)
 */
export function resetAIEngine(): void {
  engineInstance = null
}

/**
 * Get the current provider name
 */
export function getProviderName(): string {
  return createAIEngine().providerName
}

// Re-export types for convenience
export type { AIEngine, ChatMessage, ChatOptions, AISuggestion, EmailDraft, TaskDescription, PrioritizationResult, MentalLoadAnalysis, MentalLoadContext, CoachingAdvice, CoachingContext, MentalLoadFactor, TokenUsage } from '../ai-engine'
