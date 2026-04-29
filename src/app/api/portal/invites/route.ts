import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { portalProjectIdQuerySchema } from '@/lib/validations/differentiation'

/**
 * GET /api/portal/invites — List invites for the current user's projects
 * Query params: projectId (optional, filter by project)
 */
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

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    const { searchParams } = new URL(req.url)
    const query = portalProjectIdQuerySchema.safeParse({
      projectId: searchParams.get('projectId') || undefined,
    })
    if (!query.success) {
      return NextResponse.json(
        { error: 'Paramètre projectId invalide', details: query.error.flatten() },
        { status: 400 }
      )
    }
    const projectId = query.data.projectId

    // Build query - find invites for user's projects
    const where: Record<string, unknown> = { createdById: user.id }
    if (projectId) where.projectId = projectId

    const invites = await db.portalInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Portal invites GET error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des invitations' },
      { status: 500 }
    )
  }
}
