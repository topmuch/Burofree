/**
 * Zod Validation Schemas — Fiscaly Badge System
 * Strict input validation for all badge-related operations
 */

import { z } from 'zod'

/** Badge status enum */
export const BadgeStatusSchema = z.enum(['ACTIVE', 'REVOKED', 'EXPIRED'])

/** Payment status for merchant */
export const PaymentStatusSchema = z.enum(['up_to_date', 'overdue'])

/** GPS coordinates */
export const GpsCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

/** Create merchant input */
export const CreateMerchantSchema = z.object({
  commerceName: z.string().min(2).max(100),
  activity: z.string().min(2).max(100),
  quartier: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photoUrl: z.string().url().optional(),
  phone: z.string().min(8).max(20).optional(),
  taxAmount: z.number().min(0).default(0),
  currency: z.string().length(3).default('XOF'),
  tenantId: z.string().optional(),
})

/** Agent verify request */
export const AgentVerifySchema = z.object({
  agentLat: z.number().min(-90).max(90),
  agentLng: z.number().min(-180).max(180),
})

/** Validate payment request */
export const ValidatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('XOF'),
  paymentMethod: z.enum(['cash', 'mobile_money', 'card', 'bank_transfer']),
  reference: z.string().max(100).optional(),
  proofPhotoUrl: z.string().url().optional(),
  agentLat: z.number().min(-90).max(90),
  agentLng: z.number().min(-180).max(180),
})

/** Revoke badge request */
export const RevokeBadgeSchema = z.object({
  reason: z.string().min(5).max(500),
})

/** Type exports */
export type CreateMerchantInput = z.infer<typeof CreateMerchantSchema>
export type AgentVerifyInput = z.infer<typeof AgentVerifySchema>
export type ValidatePaymentInput = z.infer<typeof ValidatePaymentSchema>
export type RevokeBadgeInput = z.infer<typeof RevokeBadgeSchema>
export type BadgeStatus = z.infer<typeof BadgeStatusSchema>
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>
