/**
 * Badge Token Utility — Fiscaly QR System
 *
 * Generates, verifies, and revokes JWT-signed badge tokens.
 * Uses the existing jwt-simple.ts sign/verify (HS256).
 * Syncs with DB for revocation checking (instant invalidation).
 */

import { sign, verify } from '@/lib/jwt-simple'
import { db } from '@/lib/db'

/** Badge JWT payload structure */
export interface BadgeTokenPayload {
  merchant_id: string
  badge_id: string
  tenant_id?: string
  iat: number
  exp: number
}

/** Token verification result */
export interface BadgeVerifyResult {
  valid: boolean
  payload?: BadgeTokenPayload
  error?: string
  badge?: {
    id: string
    status: string
    merchant: {
      id: string
      commerceName: string
      activity: string
      quartier: string
      paymentStatus: string
      taxAmount: number
      currency: string
      dueDate: Date | null
      lastPaidAt: Date | null
      latitude: number
      longitude: number
      photoUrl: string | null
      phone: string | null
    }
  }
}

/**
 * Generate a badge token for a merchant.
 * Creates a JWT signed with HS256 and saves it to the database.
 *
 * @param merchantId - The merchant ID
 * @param tenantId - Optional tenant/organization ID
 * @returns The generated JWT token string
 */
export async function generateBadgeToken(
  merchantId: string,
  tenantId?: string
): Promise<string> {
  // Verify merchant exists
  const merchant = await db.merchant.findUnique({
    where: { id: merchantId },
  })
  if (!merchant) {
    throw new Error(`Merchant not found: ${merchantId}`)
  }

  // Check if merchant already has an active badge
  const existingBadge = await db.fiscalBadge.findFirst({
    where: { merchantId, status: 'ACTIVE' },
  })

  if (existingBadge) {
    // Revoke existing badge before creating new one
    await db.fiscalBadge.update({
      where: { id: existingBadge.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    })
  }

  // Generate JWT with 1 year expiry
  const token = sign(
    {
      merchant_id: merchantId,
      badge_id: '', // Will be updated after DB insert
      tenant_id: tenantId || merchant.tenantId,
    },
    { expiresIn: '365d' }
  )

  // Decode to get the badge_id placeholder — we need to create the badge first
  // Actually, let's create the badge with the token, then update the token with the badge ID
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  const badge = await db.fiscalBadge.create({
    data: {
      merchantId,
      token,
      status: 'ACTIVE',
      issuedAt: new Date(),
      expiresAt,
    },
  })

  // Re-sign with the actual badge_id
  const finalToken = sign(
    {
      merchant_id: merchantId,
      badge_id: badge.id,
      tenant_id: tenantId || merchant.tenantId,
    },
    { expiresIn: '365d' }
  )

  // Update badge with the final token
  await db.fiscalBadge.update({
    where: { id: badge.id },
    data: { token: finalToken },
  })

  return finalToken
}

/**
 * Verify a badge token.
 * Checks: JWT signature, expiration, DB badge status.
 * Returns full verification result with merchant data.
 *
 * @param token - The JWT token to verify
 * @returns Verification result with payload and merchant data
 */
export async function verifyBadgeToken(token: string): Promise<BadgeVerifyResult> {
  try {
    // 1. Verify JWT signature and expiration
    const payload = verify(token) as BadgeTokenPayload

    // 2. Check DB for badge status (revocation check)
    const badge = await db.fiscalBadge.findUnique({
      where: { token },
      include: {
        merchant: {
          select: {
            id: true,
            commerceName: true,
            activity: true,
            quartier: true,
            paymentStatus: true,
            taxAmount: true,
            currency: true,
            dueDate: true,
            lastPaidAt: true,
            latitude: true,
            longitude: true,
            photoUrl: true,
            phone: true,
          },
        },
      },
    })

    if (!badge) {
      return { valid: false, error: 'Badge non trouvé dans la base de données' }
    }

    // 3. Check badge status
    if (badge.status === 'REVOKED') {
      return { valid: false, error: 'Badge révoqué', payload, badge: undefined }
    }

    if (badge.status === 'EXPIRED' || new Date() > badge.expiresAt) {
      // Auto-expire in DB if not already
      if (badge.status !== 'EXPIRED') {
        await db.fiscalBadge.update({
          where: { id: badge.id },
          data: { status: 'EXPIRED' },
        })
      }
      return { valid: false, error: 'Badge expiré', payload, badge: undefined }
    }

    // 4. Verify payload matches DB record
    if (payload.merchant_id !== badge.merchantId || payload.badge_id !== badge.id) {
      return { valid: false, error: 'Incohérence token/base de données' }
    }

    // 5. Update scan metadata
    await db.fiscalBadge.update({
      where: { id: badge.id },
      data: {
        lastScannedAt: new Date(),
        scanCount: { increment: 1 },
      },
    })

    return {
      valid: true,
      payload,
      badge: {
        id: badge.id,
        status: badge.status,
        merchant: {
          ...badge.merchant,
          dueDate: badge.merchant.dueDate,
          lastPaidAt: badge.merchant.lastPaidAt,
        },
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de vérification'
    if (message.includes('expired') || message.includes('Token expired')) {
      return { valid: false, error: 'Badge expiré' }
    }
    if (message.includes('signature')) {
      return { valid: false, error: 'Signature invalide' }
    }
    return { valid: false, error: `Token invalide: ${message}` }
  }
}

/**
 * Revoke a badge by merchant ID.
 * Instantly invalidates the badge by updating DB status.
 *
 * @param merchantId - The merchant whose badge should be revoked
 * @param revokedBy - The user ID performing the revocation
 * @param reason - Reason for revocation
 */
export async function revokeBadge(
  merchantId: string,
  revokedBy: string,
  reason?: string
): Promise<void> {
  const badge = await db.fiscalBadge.findFirst({
    where: { merchantId, status: 'ACTIVE' },
  })

  if (!badge) {
    throw new Error(`Aucun badge actif trouvé pour ce commerce`)
  }

  await db.fiscalBadge.update({
    where: { id: badge.id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedBy,
    },
  })
}

/**
 * Get public-safe merchant data from a verified badge.
 * Returns ONLY non-sensitive data for the public page.
 */
export function getPublicMerchantData(badge: NonNullable<BadgeVerifyResult['badge']>) {
  const m = badge.merchant
  const isOverdue = m.paymentStatus === 'overdue'
  const daysOverdue = isOverdue && m.dueDate
    ? Math.floor((Date.now() - m.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    commerceName: m.commerceName,
    activity: m.activity,
    quartier: m.quartier,
    paymentStatus: m.paymentStatus,
    isOverdue,
    daysOverdue,
    amountDue: isOverdue ? m.taxAmount : 0,
    currency: m.currency,
  }
}

/**
 * Get full merchant data for agent view.
 * Returns all data including GPS, phone, photo.
 */
export function getAgentMerchantData(badge: NonNullable<BadgeVerifyResult['badge']>) {
  const m = badge.merchant
  const isOverdue = m.paymentStatus === 'overdue'
  const daysOverdue = isOverdue && m.dueDate
    ? Math.floor((Date.now() - m.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    id: m.id,
    commerceName: m.commerceName,
    activity: m.activity,
    quartier: m.quartier,
    paymentStatus: m.paymentStatus,
    isOverdue,
    daysOverdue,
    taxAmount: m.taxAmount,
    amountDue: isOverdue ? m.taxAmount : 0,
    currency: m.currency,
    dueDate: m.dueDate,
    lastPaidAt: m.lastPaidAt,
    latitude: m.latitude,
    longitude: m.longitude,
    photoUrl: m.photoUrl,
    phone: m.phone,
  }
}
