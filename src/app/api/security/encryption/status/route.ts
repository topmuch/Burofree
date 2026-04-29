/**
 * GET /api/security/encryption/status — Get encryption key status (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/features/superadmin/utils/admin-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { getEncryptionStatus } from '@/features/security/encryption/service'
import { logSecurityAction } from '@/features/security/audit/logger'

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

    // Require superadmin
    const { admin, response } = await requireSuperAdmin(req)
    if (!admin) return response!

    const status = await getEncryptionStatus()

    // Log access
    await logSecurityAction({
      userId: admin.id,
      action: 'encryption.status_viewed',
      target: 'encryption',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('Encryption status error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du statut de chiffrement' },
      { status: 500 }
    )
  }
}
