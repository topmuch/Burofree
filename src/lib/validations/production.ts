import { z } from 'zod'

// ─── PWA / Offline Schemas ─────────────────────────────────────────────────

export const offlineSyncSchema = z.object({
  actions: z.array(z.object({
    actionType: z.enum(['create_task', 'update_task', 'create_note', 'create_email_draft', 'create_time_entry', 'update_project']),
    entityType: z.enum(['task', 'note', 'email', 'time_entry', 'project']),
    entityId: z.string().optional(),
    payload: z.record(z.unknown()),
  })).min(1).max(100, 'Maximum 100 actions par synchronisation'),
})

// ─── Stripe / Subscription Schemas ─────────────────────────────────────────

export const checkoutCreateSchema = z.object({
  planId: z.enum(['pro', 'enterprise']),
  trialDays: z.number().int().min(0).max(30).optional(),
})

export const subscriptionQuerySchema = z.object({
  status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused']).optional(),
})

// ─── Teams Schemas ──────────────────────────────────────────────────────────

export const teamCreateSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(50),
  description: z.string().max(500).optional(),
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
})

export const teamUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
})

export const teamInviteSchema = z.object({
  teamId: z.string().min(1, 'L\'ID de l\'équipe est requis'),
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
})

export const teamAcceptSchema = z.object({
  token: z.string().min(1, 'Le token d\'invitation est requis'),
  action: z.enum(['accept', 'decline']),
})

export const teamMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

// ─── Export / Import Schemas ────────────────────────────────────────────────

export const exportCreateSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('csv'),
  entityType: z.enum(['tasks', 'invoices', 'projects', 'time_entries', 'contacts', 'all']).default('all'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeArchived: z.boolean().default(false),
})

export const importCreateSchema = z.object({
  format: z.enum(['csv', 'json']).default('json'),
  entityType: z.enum(['tasks', 'invoices', 'projects', 'time_entries']).default('tasks'),
  data: z.array(z.record(z.unknown())).min(1).max(10000, 'Maximum 10000 enregistrements'),
  previewOnly: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true),
})

// ─── Backup Schemas ─────────────────────────────────────────────────────────

export const backupRestoreSchema = z.object({
  snapshotId: z.string().min(1, 'L\'ID du snapshot est requis'),
  confirmation: z.string().refine(val => val === 'CONFIRM_RESTORE', {
    message: 'Confirmation requise: tapez CONFIRM_RESTORE',
  }),
})

export const backupQuerySchema = z.object({
  type: z.enum(['hourly', 'daily', 'weekly', 'manual']).optional(),
  status: z.enum(['completed', 'failed', 'pending', 'restoring']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// ─── Audit Log Schemas ──────────────────────────────────────────────────────

export const auditLogQuerySchema = z.object({
  teamId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─── Health Check Schemas ───────────────────────────────────────────────────

export const healthAlertSchema = z.object({
  level: z.enum(['warning', 'critical']),
  message: z.string().min(1),
})
