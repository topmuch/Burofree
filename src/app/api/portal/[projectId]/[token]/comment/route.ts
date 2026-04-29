import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { portalCommentSchema } from '@/lib/validations/differentiation'
import { verifyPortalToken } from '@/features/differentiation/portal/portal-token'

/**
 * POST /api/portal/[projectId]/[token]/comment — Client action (PUBLIC route)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; token: string }> }
) {
  try {
    const { projectId, token } = await params

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

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

    // Validate input
    const body = await req.json()
    const parsed = portalCommentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { entityType, entityId, action, content, authorName, authorEmail } = parsed.data

    // For "comment" action, content is required
    if (action === 'comment' && (!content || content.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Un commentaire est requis pour cette action' },
        { status: 400 }
      )
    }

    // Create comment
    const comment = await db.portalComment.create({
      data: {
        inviteId,
        entityType,
        entityId,
        action,
        content: content ?? '',
        authorName: authorName ?? 'Anonyme',
        authorEmail: authorEmail ?? '',
      },
    })

    const actionLabels: Record<string, string> = {
      comment: 'Commentaire ajouté',
      approve: 'Approbation enregistrée',
      request_revision: 'Demande de révision envoyée',
    }

    return NextResponse.json({
      message: actionLabels[action] || 'Action enregistrée',
      comment,
    }, { status: 201 })
  } catch (error) {
    console.error('Portal comment POST error:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du commentaire" },
      { status: 500 }
    )
  }
}
