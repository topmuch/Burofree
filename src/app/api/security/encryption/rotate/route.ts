/**
 * POST /api/security/encryption/rotate — Rotate encryption key (superadmin only)
 * Creates a new key version and marks the old one as expired.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/features/superadmin/utils/admin-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { rotateEncryptionKey } from '@/features/security/encryption/service'
import { logSecurityAction } from '@/features/security/audit/logger'
import { encryptionRotateSchema } from '@/lib/validations/security'

// Stricter rate limit for key rotation: 2 per hour
const ROTATE_RATE_LIMIT = { maxRequests: 2, windowMs: 60 * 60 * 1000 }

export async function POST(req: NextRequest) {
  try {
    // Rate limiting — strict for key rotation
    const rateLimitId = getRateLimitIdentifier(req, 'encryption-rotate')
    const rateLimit = checkRateLimit(rateLimitId, ROTATE_RATE_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rotation de clé limitée. Maximum 2 par heure.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
        }
      )
    }

    // Require superadmin
    const { admin, response } = await requireSuperAdmin(req)
    if (!admin) return response!

    // Validate input
    const body = await req.json().catch(() => ({}))
    const parsed = encryptionRotateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { reason } = parsed.data

    // Rotate key
    const result = await rotateEncryptionKey(admin.id)

    // Log the rotation (critical security event)
    await logSecurityAction({
      userId: admin.id,
      action: 'encryption.key_rotated',
      target: 'encryption',
      metadata: {
        oldVersion: result.oldVersion,
        newVersion: result.newVersion,
        reason: reason || 'Scheduled rotation',
      },
      req,
    })

    // Also log to SuperAdmin audit log
    const { logAdminAction } = await import('@/features/superadmin/utils/admin-guard')
    await logAdminAction(admin.id, 'encryption.key_rotated', 'encryption', null, {
      oldVersion: result.oldVersion,
      newVersion: result.newVersion,
      reason: reason || 'Scheduled rotation',
    }, req)

    return NextResponse.json({
      message: 'Clé de chiffrement rotationnée avec succès',
      oldVersion: result.oldVersion,
      newVersion: result.newVersion,
    })
  } catch (error) {
    console.error('Encryption rotate error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la rotation de la clé de chiffrement' },
      { status: 500 }
    )
  }
}
