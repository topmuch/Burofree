/**
 * Zod validation schemas for Security & Compliance API routes.
 * All inputs are validated before processing.
 */

import { z } from 'zod'

// ─── GDPR Export ─────────────────────────────────────────────────────────────

export const gdprExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json').optional(),
})

// ─── GDPR Deletion ───────────────────────────────────────────────────────────

export const gdprDeleteRequestSchema = z.object({
  password: z.string().optional(), // Optional password confirmation
})

export const gdprDeleteConfirmSchema = z.object({
  confirmed: z.literal(true), // Must explicitly be true for double confirmation
})

// ─── GDPR Cancel ─────────────────────────────────────────────────────────────

export const gdprCancelSchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─── Consent ─────────────────────────────────────────────────────────────────

export const consentUpdateSchema = z.object({
  consents: z.object({
    analytics: z.boolean().optional(),
    functional: z.boolean().optional(),
    marketing: z.boolean().optional(),
    // essential is always true and cannot be changed
  }),
})

// ─── DPO Contact ─────────────────────────────────────────────────────────────

export const dpoContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  subject: z.string().min(1).max(500),
  message: z.string().min(10).max(5000),
})

export const dpoContactQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
})

// ─── Encryption ──────────────────────────────────────────────────────────────

export const encryptionRotateSchema = z.object({
  reason: z.string().min(3).max(500).optional(),
})
