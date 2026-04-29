/**
 * POST /api/gdpr/cancel — Cancel pending account deletion
 * Restores email so user can log in again.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { cancelAccountDeletion } from '@/features/security/gdpr/service'

export async function POST(req: NextRequest) {
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

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    await cancelAccountDeletion(user.id)

    return NextResponse.json({
      message: 'Demande de suppression annulée. Votre email a été restauré et vous pouvez vous reconnecter.',
    })
  } catch (error) {
    console.error('GDPR cancel error:', error)

    if (error instanceof Error) {
      if (error.message.includes('already been deleted')) {
        return NextResponse.json({ error: error.message }, { status: 410 })
      }
      if (error.message.includes('already been cancelled')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.message.includes('No deletion schedule')) {
        return NextResponse.json(
          { error: 'Aucune demande de suppression en cours' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'annulation de la suppression' },
      { status: 500 }
    )
  }
}
