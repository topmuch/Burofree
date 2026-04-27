import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { portalInviteIdSchema } from '@/lib/validations/differentiation'

/**
 * DELETE /api/portal/invites/[inviteId] — Revoke an invite
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
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

    const { inviteId: rawInviteId } = await params
    const parsed = portalInviteIdSchema.safeParse(rawInviteId)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ID d\'invitation invalide', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const inviteId = parsed.data

    // Find invite and verify ownership
    const invite = await db.portalInvite.findUnique({
      where: { id: inviteId },
    })

    if (!invite || invite.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Invitation introuvable' },
        { status: 404 }
      )
    }

    // Soft delete (set isActive to false)
    await db.portalInvite.update({
      where: { id: inviteId },
      data: { isActive: false },
    })

    return NextResponse.json({
      message: 'Invitation révoquée',
    })
  } catch (error) {
    console.error('Portal invite DELETE error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la révocation' },
      { status: 500 }
    )
  }
}
