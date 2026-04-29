import { z } from 'zod'

// ─── Focus Session Schemas ─────────────────────────────────────────────

export const focusSessionCreateSchema = z.object({
  type: z.enum(['pomodoro', 'deep_work', 'custom']).default('pomodoro'),
  durationMinutes: z.number().int().min(1).max(180).default(25),
  breakMinutes: z.number().int().min(1).max(60).default(5),
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  ambientSound: z.enum(['rain', 'forest', 'cafe', 'fireplace', 'white_noise']).optional().nullable(),
})

export const focusSessionUpdateSchema = z.object({
  endedAt: z.string().datetime().optional(),
  pausedAt: z.string().datetime().optional(),
  totalPausedSec: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
})

export const focusSessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  completed: z.enum(['true', 'false']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

// ─── Voice Log Schemas ─────────────────────────────────────────────────

export const voiceLogSchema = z.object({
  transcript: z.string().min(1, 'La transcription est requise').max(1000),
  intent: z.string().max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
  executed: z.boolean().default(false),
  error: z.string().max(500).optional(),
})

export const voiceHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─── Marketplace Schemas ──────────────────────────────────────────────

export const moduleSubscribeSchema = z.object({
  moduleId: z.string().min(1, 'L\'ID du module est requis'),
  action: z.enum(['subscribe', 'trial', 'cancel', 'reactivate']),
})

export const moduleUpdateSchema = z.object({
  status: z.enum(['active', 'cancelled', 'expired', 'trial']),
})

// ─── Portal Schemas ───────────────────────────────────────────────────

export const portalInviteCreateSchema = z.object({
  projectId: z.string().min(1, 'L\'ID du projet est requis'),
  clientEmail: z.string().email('Email invalide'),
  clientName: z.string().min(1, 'Le nom du client est requis').max(100),
  expiresInDays: z.number().int().min(1).max(365).default(30),
})

export const portalCommentSchema = z.object({
  entityType: z.enum(['task', 'invoice', 'project']),
  entityId: z.string().min(1, 'L\'ID de l\'entité est requis'),
  action: z.enum(['comment', 'approve', 'request_revision']),
  content: z.string().max(2000).optional(),
  authorName: z.string().max(100).optional(),
  authorEmail: z.string().email().optional(),
})

// ─── Integration Schemas ──────────────────────────────────────────────

export const validProviders = ['slack', 'zoom', 'google_drive', 'github', 'notion'] as const
export type ValidProvider = (typeof validProviders)[number]

export const providerParamSchema = z.enum(validProviders)

export const integrationConnectSchema = z.object({
  provider: z.string().min(1, 'Le fournisseur est requis'),
  code: z.string().min(1, 'Le code d\'autorisation est requis'),
  redirectUri: z.string().url().optional(),
})

export const integrationDisconnectSchema = z.object({
  provider: z.enum(validProviders, { message: 'Fournisseur non supporté' }),
})

export const portalInviteIdSchema = z.string().min(1, 'L\'ID de l\'invitation est requis')

export const portalProjectIdQuerySchema = z.object({
  projectId: z.string().min(1, 'L\'ID du projet est requis').optional(),
})

export const focusStatsRangeSchema = z.enum(['week', 'month', 'year']).default('month')
