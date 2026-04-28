import { z } from 'zod'

// ─── Campaign Create Schema ──────────────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  subject: z.string().min(1, 'Email subject is required').max(500),
  fromName: z.string().max(200).optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  previewText: z.string().max(500).optional(),
  contentHtml: z.string().optional(),
  contentMjml: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']).optional(),
  scheduleAt: z.string().datetime({ offset: true }).optional().nullable(),
  throttlePerHour: z.number().int().min(0).default(0),
  segmentIds: z.array(z.string()).optional().default([]),
  templateId: z.string().optional(),
  senderAddress: z.string().max(500).optional(),
  listUnsubscribe: z.boolean().default(true),
  doubleOptIn: z.boolean().default(false),
})

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>

// ─── Campaign Update Schema (partial of create) ──────────────────────────

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  fromName: z.string().max(200).optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  previewText: z.string().max(500).optional(),
  contentHtml: z.string().optional(),
  contentMjml: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']).optional(),
  scheduleAt: z.string().datetime({ offset: true }).optional().nullable(),
  throttlePerHour: z.number().int().min(0).optional(),
  segmentIds: z.array(z.string()).optional(),
  templateId: z.string().optional(),
  senderAddress: z.string().max(500).optional(),
  listUnsubscribe: z.boolean().optional(),
  doubleOptIn: z.boolean().optional(),
})

export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>

// ─── Campaign Query Schema ───────────────────────────────────────────────

export const campaignQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type CampaignQueryInput = z.infer<typeof campaignQuerySchema>

// ─── Campaign Send Schema ────────────────────────────────────────────────

export const campaignSendSchema = z.object({
  simulate: z.boolean().default(false),
  scheduleAt: z.string().datetime({ offset: true }).optional().nullable(),
})

export type CampaignSendInput = z.infer<typeof campaignSendSchema>

// ─── Campaign Stats Query Schema ─────────────────────────────────────────

export const campaignStatsQuerySchema = z.object({
  includeRecipients: z.enum(['true', 'false']).default('false'),
  recipientPage: z.coerce.number().int().min(1).default(1),
  recipientLimit: z.coerce.number().int().min(1).max(100).default(25),
  recipientStatus: z.enum(['pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'unsubscribed', 'complained']).optional(),
})

export type CampaignStatsQueryInput = z.infer<typeof campaignStatsQuerySchema>
