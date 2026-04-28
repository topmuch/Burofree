/**
 * POST /api/gdpr/delete — Request account deletion (GDPR Art. 17)
 * DELETE /api/gdpr/delete — Confirm account deletion (double-check)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { getClientIp } from '@/features/security/audit/logger'
import {
  requestAccountDeletion,
  confirmAccountDeletion,
  getDeletionSchedule,
} from '@/features/security/gdpr/service'
import { gdprDeleteConfirmSchema } from '@/lib/validations/security'

/**
 * POST — Request account deletion
 * Creates a 30-day grace period schedule and anonymizes email immediately.
 */
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

    const ipAddress = getClientIp(req)

    const result = await requestAccountDeletion(user.id, ipAddress)

    return NextResponse.json({
      message: 'Demande de suppression créée. Vous devez confirmer la suppression pour qu\'elle soit exécutée après la période de grâce.',
      gracePeriodEnd: result.gracePeriodEnd,
      scheduleId: result.scheduleId,
    })
  } catch (error) {
    console.error('GDPR delete request error:', error)

    if (error instanceof Error) {
      if (error.message.includes('already pending')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.message.includes('already been deleted')) {
        return NextResponse.json({ error: error.message }, { status: 410 })
      }
      if (error.message === 'User not found') {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors de la demande de suppression' },
      { status: 500 }
    )
  }
}

/**
 * DELETE — Confirm account deletion (double confirmation)
 * Sets status='confirmed' on the deletion schedule.
 * The actual deletion will happen after gracePeriodEnd via executePendingDeletions().
 */
export async function DELETE(req: NextRequest) {
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

    // Validate body — requires explicit confirmation
    const body = await req.json()
    const parsed = gdprDeleteConfirmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Confirmation requise. Le champ "confirmed" doit être true.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Check current schedule
    const schedule = await getDeletionSchedule(user.id)
    if (!schedule) {
      return NextResponse.json(
        { error: 'Aucune demande de suppression en cours' },
        { status: 404 }
      )
    }

    await confirmAccountDeletion(user.id)

    return NextResponse.json({
      message: 'Suppression confirmée. Vos données seront anonymisées après la période de grâce.',
      gracePeriodEnd: schedule.gracePeriodEnd,
    })
  } catch (error) {
    console.error('GDPR delete confirm error:', error)

    if (error instanceof Error) {
      if (error.message.includes('current status')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors de la confirmation de suppression' },
      { status: 500 }
    )
  }
}
