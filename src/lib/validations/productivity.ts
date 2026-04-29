import { z } from 'zod'

// Templates
export const templateCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['contract', 'quote', 'email', 'project_structure', 'client_response']),
  content: z.string().min(1, 'Le contenu est requis').max(50000),
  variables: z.array(z.string()).optional(),
  category: z.string().max(50).default('general'),
  icon: z.string().max(50).optional(),
  isDefault: z.boolean().default(false),
})

export const templateUpdateSchema = templateCreateSchema.partial()

export const templateApplySchema = z.object({
  variables: z.record(z.string(), z.string()).default({}),
})

// Automations
export const automationPrefSchema = z.object({
  type: z.enum(['overdue_tasks', 'unpaid_invoices', 'meeting_reminder', 'email_followup']),
  enabled: z.boolean().optional(),
  channel: z.enum(['in_app', 'email', 'both']).optional(),
  frequency: z.enum(['15min', '30min', '1h', 'daily']).optional(),
  threshold: z.number().int().min(0).max(365).optional(),
})

// Analytics
export const analyticsRangeSchema = z.enum(['week', 'month', 'year']).default('month')

export const analyticsExportSchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  range: analyticsRangeSchema,
})

// Search
export const searchQuerySchema = z.object({
  q: z.string().min(2, 'La recherche doit contenir au moins 2 caractères').max(200),
  type: z.enum(['task', 'email', 'document', 'contact', 'all']).default('all'),
  filters: z.string().max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Tags
export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hex invalide').default('#10b981'),
  icon: z.string().max(50).optional(),
  category: z.enum(['urgent', 'client', 'status', 'billing', 'custom', 'general']).default('general'),
})

export const tagUpdateSchema = tagCreateSchema.partial()

export const tagAssignSchema = z.object({
  tagId: z.string().min(1),
  entityType: z.enum(['task', 'email', 'document', 'project']),
  entityIds: z.array(z.string().min(1)).min(1).max(100, 'Maximum 100 entités à la fois'),
})

// Automation Logs
export const logsQuerySchema = z.object({
  type: z.string().optional(),
  action: z.string().optional(),
  success: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
