import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPortalToken } from '@/features/differentiation/portal/portal-token'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'

/**
 * GET /api/portal/[projectId]/[token]/comments — Get comments (PUBLIC route)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; token: string }> }
) {
  try {
    // Rate limiting (public route)
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rateLimit.remaining, rateLimit.retryAfterMs) }
      )
    }

    const { projectId, token } = await params

    // Verify token
    const inviteId = verifyPortalToken(token, projectId)
    if (!inviteId) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré' },
        { status: 403 }
      )
    }

    // Get invite
    const invite = await db.portalInvite.findUnique({
      where: { id: inviteId },
    })

    if (!invite || !invite.isActive) {
      return NextResponse.json(
        { error: 'Invitation désactivée' },
        { status: 403 }
      )
    }

    // Check expiration
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Ce lien a expiré' },
        { status: 403 }
      )
    }

    // Get query params for filtering
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    const where: Record<string, unknown> = { inviteId }
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId

    const comments = await db.portalComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Portal comments GET error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des commentaires' },
      { status: 500 }
    )
  }
}
