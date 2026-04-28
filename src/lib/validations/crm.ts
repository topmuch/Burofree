import { z } from 'zod'

// ─── Analytics Query Schemas ──────────────────────────────────────────────

export const analyticsPeriodSchema = z.enum(['7d', '30d', '90d']).default('30d')

export const analyticsOverviewQuerySchema = z.object({
  period: analyticsPeriodSchema,
})

export const analyticsContactsQuerySchema = z.object({
  period: analyticsPeriodSchema,
})

export const analyticsPipelineQuerySchema = z.object({
  period: analyticsPeriodSchema,
  pipelineId: z.string().optional(),
})

export const analyticsCampaignsQuerySchema = z.object({
  period: analyticsPeriodSchema,
})

export const analyticsExportQuerySchema = z.object({
  format: z.enum(['csv']).default('csv'),
  period: analyticsPeriodSchema,
  type: z.enum(['contacts', 'pipeline', 'campaigns', 'overview']).default('overview'),
})
