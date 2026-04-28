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

// ─── Contact Schemas ──────────────────────────────────────────────────────

export const contactCreateSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  addresses: z.string().optional(), // JSON
  customFields: z.string().optional(), // JSON
  tags: z.string().optional(), // JSON array
  source: z.enum(['manual', 'import', 'form', 'api', 'referral']).default('manual'),
  status: z.enum(['active', 'inactive', 'bounced', 'unsubscribed']).default('active'),
  lifecycle: z.enum(['lead', 'qualified', 'opportunity', 'customer', 'churned']).default('lead'),
  score: z.number().int().min(0).max(100).default(0),
  teamId: z.string().optional().nullable(),
})
export type ContactCreateInput = z.infer<typeof contactCreateSchema>

export const contactUpdateSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  addresses: z.string().optional(),
  customFields: z.string().optional(),
  tags: z.string().optional(),
  source: z.enum(['manual', 'import', 'form', 'api', 'referral']).optional(),
  status: z.enum(['active', 'inactive', 'bounced', 'unsubscribed']).optional(),
  lifecycle: z.enum(['lead', 'qualified', 'opportunity', 'customer', 'churned']).optional(),
  score: z.number().int().min(0).max(100).optional(),
  teamId: z.string().optional().nullable(),
})
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>

export const contactQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'bounced', 'unsubscribed']).optional(),
  lifecycle: z.enum(['lead', 'qualified', 'opportunity', 'customer', 'churned']).optional(),
  source: z.enum(['manual', 'import', 'form', 'api', 'referral']).optional(),
  company: z.string().optional(),
  tag: z.string().optional(),
  scoreMin: z.coerce.number().int().min(0).optional(),
  scoreMax: z.coerce.number().int().max(100).optional(),
  teamId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['createdAt', 'lastName', 'score', 'lastActivityAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})
export type ContactQueryInput = z.infer<typeof contactQuerySchema>

export const activityQuerySchema = z.object({
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
})

export const contactNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  isPinned: z.boolean().default(false),
})

export const csvImportSchema = z.object({
  data: z.string().min(1),
  teamId: z.string().optional().nullable(),
  mapping: z.record(z.string(), z.string()).optional(),
})

// ─── Pipeline Schemas ─────────────────────────────────────────────────────

export const pipelineStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
  probability: z.number().int().min(0).max(100).default(0),
})
export type PipelineStageInput = z.infer<typeof pipelineStageSchema>

export const pipelineCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  stages: z.string().default('[]'), // JSON array of stages
  isDefault: z.boolean().default(false),
  teamId: z.string().optional().nullable(),
})
export type PipelineCreateInput = z.infer<typeof pipelineCreateSchema>

export const pipelineUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  stages: z.string().optional(), // JSON array of stages
  isDefault: z.boolean().optional(),
  teamId: z.string().optional().nullable(),
})
export type PipelineUpdateInput = z.infer<typeof pipelineUpdateSchema>

// ─── Deal Schemas ─────────────────────────────────────────────────────────

export const dealCreateSchema = z.object({
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  value: z.number().min(0).default(0),
  currency: z.string().length(3).default('EUR'),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional().nullable(), // ISO date string
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
})
export type DealCreateInput = z.infer<typeof dealCreateSchema>

export const dealUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  stageId: z.string().optional(),
  expectedCloseDate: z.string().optional().nullable(),
  actualCloseDate: z.string().optional().nullable(),
  status: z.enum(['open', 'won', 'lost', 'abandoned']).optional(),
  lossReason: z.string().max(500).optional().nullable(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
})
export type DealUpdateInput = z.infer<typeof dealUpdateSchema>

export const dealQuerySchema = z.object({
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  status: z.enum(['open', 'won', 'lost', 'abandoned']).optional(),
  contactId: z.string().optional(),
  assignedToId: z.string().optional(),
  teamId: z.string().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['createdAt', 'value', 'expectedCloseDate', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})
export type DealQueryInput = z.infer<typeof dealQuerySchema>

// ─── Campaign Schemas ─────────────────────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  fromName: z.string().max(200).optional().nullable(),
  fromEmail: z.string().email().optional().nullable(),
  replyTo: z.string().email().optional().nullable(),
  previewText: z.string().max(500).optional().nullable(),
  contentHtml: z.string().optional().nullable(),
  contentMjml: z.string().optional().nullable(),
  scheduleAt: z.string().optional().nullable(), // ISO datetime
  throttlePerHour: z.number().int().min(0).default(0),
  segmentIds: z.array(z.string()).optional().default([]),
  templateId: z.string().optional().nullable(),
  senderAddress: z.string().max(500).optional().nullable(),
  listUnsubscribe: z.boolean().default(true),
  doubleOptIn: z.boolean().default(false),
  teamId: z.string().optional().nullable(),
})

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  fromName: z.string().max(200).optional().nullable(),
  fromEmail: z.string().email().optional().nullable(),
  replyTo: z.string().email().optional().nullable(),
  previewText: z.string().max(500).optional().nullable(),
  contentHtml: z.string().optional().nullable(),
  contentMjml: z.string().optional().nullable(),
  scheduleAt: z.string().optional().nullable(), // null = unschedule
  throttlePerHour: z.number().int().min(0).optional(),
  segmentIds: z.array(z.string()).optional(),
  templateId: z.string().optional().nullable(),
  senderAddress: z.string().max(500).optional().nullable(),
  listUnsubscribe: z.boolean().optional(),
  doubleOptIn: z.boolean().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']).optional(),
  teamId: z.string().optional().nullable(),
})

export const campaignQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']).optional(),
  search: z.string().optional(),
  teamId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const campaignSendSchema = z.object({
  action: z.enum(['send', 'schedule']).default('send'),
  scheduleAt: z.string().optional().nullable(), // ISO datetime
})

// ─── Workflow Schemas ─────────────────────────────────────────────────────

const workflowTriggerSchema = z.object({
  type: z.enum([
    'contact.created',
    'contact.updated',
    'deal.stage_changed',
    'deal.status_changed',
    'email.received',
    'email.opened',
    'tag.added',
    'campaign.opened',
    'date.reached',
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
})

const workflowActionSchema = z.object({
  type: z.enum([
    'email.send',
    'tag.add',
    'tag.remove',
    'assign.to',
    'create.task',
    'delay.hours',
    'webhook.call',
    'ai.generate_reply',
    'update.field',
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
})

export const workflowCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  trigger: workflowTriggerSchema,
  actions: z.array(workflowActionSchema).min(1),
  isActive: z.boolean().default(true),
  isTest: z.boolean().default(false),
  teamId: z.string().optional().nullable(),
})

export const workflowUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  trigger: workflowTriggerSchema.optional(),
  actions: z.array(workflowActionSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  isTest: z.boolean().optional(),
  teamId: z.string().optional().nullable(),
})

export const workflowQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  teamId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const workflowExecuteSchema = z.object({
  contactId: z.string().optional().nullable(),
  conversationId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  testData: z.record(z.string(), z.unknown()).optional().nullable(),
})

// ─── Email Template Schemas ───────────────────────────────────────────────

export const emailTemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(500).optional().nullable(),
  contentHtml: z.string().min(1),
  contentMjml: z.string().optional().nullable(),
  variables: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().default(false),
  })).optional().default([]),
  category: z.enum(['general', 'onboarding', 'follow_up', 'newsletter', 'transactional']).default('general'),
  shortcut: z.string().max(50).optional().nullable(),
  isShared: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  thumbnail: z.string().url().optional().nullable(),
  teamId: z.string().optional().nullable(),
})

export const emailTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().max(500).optional().nullable(),
  contentHtml: z.string().min(1).optional(),
  contentMjml: z.string().optional().nullable(),
  variables: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().default(false),
  })).optional(),
  category: z.enum(['general', 'onboarding', 'follow_up', 'newsletter', 'transactional']).optional(),
  shortcut: z.string().max(50).optional().nullable(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  thumbnail: z.string().url().optional().nullable(),
  teamId: z.string().optional().nullable(),
})

export const emailTemplateQuerySchema = z.object({
  category: z.enum(['general', 'onboarding', 'follow_up', 'newsletter', 'transactional']).optional(),
  teamId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
