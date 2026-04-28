/**
 * Zod validation schemas for Superadmin API routes.
 * All inputs are validated before processing.
 */

import { z } from 'zod'

// ─── User Management ───────────────────────────────────────────────────────

export const userSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'suspended', 'all']).optional(),
  plan: z.enum(['free', 'pro', 'enterprise', 'all']).optional(),
  sortBy: z.enum(['createdAt', 'email', 'name', 'lastActivity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
})

export const userBulkActionSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
  action: z.enum(['suspend', 'unsuspend', 'force_logout', 'reset_2fa', 'delete', 'anonymize']),
  reason: z.string().min(3).max(500).optional(),
})

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
  suspendedAt: z.date().nullable().optional(),
})

// ─── Impersonation ──────────────────────────────────────────────────────────

export const impersonateStartSchema = z.object({
  targetUserId: z.string().min(1),
  reason: z.string().min(3).max(500),
})

export const impersonateEndSchema = z.object({
  sessionId: z.string().min(1),
})

// ─── Subscription Management ────────────────────────────────────────────────

export const subscriptionAdjustSchema = z.object({
  action: z.enum([
    'cancel',
    'reactivate',
    'upgrade',
    'downgrade',
    'extend_trial',
    'apply_credit',
    'free_month',
  ]),
  reason: z.string().min(3).max(500),
  priceId: z.string().optional(), // For upgrade/downgrade
  creditAmount: z.number().min(0).optional(), // For apply_credit
  trialDays: z.number().min(1).max(90).optional(), // For extend_trial
})

export const subscriptionSearchSchema = z.object({
  status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'all']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
})

// ─── Platform Config ────────────────────────────────────────────────────────

export const configUpdateSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  category: z.enum(['general', 'billing', 'features', 'legal', 'email']).default('general'),
  description: z.string().max(500).optional(),
})

export const configBulkUpdateSchema = z.object({
  configs: z.array(configUpdateSchema).min(1).max(50),
})

// ─── Feature Flags ──────────────────────────────────────────────────────────

export const featureFlagCreateSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
  rollout: z.number().min(0).max(100).default(0),
  segments: z.array(z.string()).default([]),
})

export const featureFlagUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  rollout: z.number().min(0).max(100).optional(),
  segments: z.array(z.string()).optional(),
})

// ─── Support Tickets ────────────────────────────────────────────────────────

export const ticketUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_user', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedTo: z.string().nullable().optional(),
  resolution: z.string().max(2000).optional(),
})

// ─── Audit Log Search ──────────────────────────────────────────────────────

export const auditLogSearchSchema = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
  target: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

// ─── Financial Reporting ────────────────────────────────────────────────────

export const financialReportSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  format: z.enum(['json', 'csv']).default('json'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// ─── RGPD Data Export ──────────────────────────────────────────────────────

export const rgpdExportSchema = z.object({
  userId: z.string().min(1),
  includeInvoices: z.boolean().default(true),
  includeEmails: z.boolean().default(true),
  includeDocuments: z.boolean().default(true),
  includeTimeEntries: z.boolean().default(true),
})

export const rgpdDeleteSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(10).max(1000),
  confirmEmail: z.string().email(),
})
