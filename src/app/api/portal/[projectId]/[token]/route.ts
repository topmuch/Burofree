import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPortalToken } from '@/features/differentiation/portal/portal-token'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'

/**
 * GET /api/portal/[projectId]/[token] — Access portal (PUBLIC route, no auth)
 * Returns project data (tasks, documents, milestones) — READ ONLY
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

    // Get project data
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        clientName: true,
        color: true,
        status: true,
        deadline: true,
        createdAt: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projet introuvable' },
        { status: 404 }
      )
    }

    // Get tasks
    const tasks = await db.task.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        category: true,
        estimatedTime: true,
        actualTime: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get documents
    const documents = await db.document.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        type: true,
        mimeType: true,
        size: true,
        fileUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get milestones (tasks with due dates)
    const milestones = tasks
      .filter(t => t.dueDate)
      .map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        completedAt: t.completedAt,
      }))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

    // Update access stats
    await db.portalInvite.update({
      where: { id: inviteId },
      data: {
        accessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    })

    // Client info for the portal
    const clientInfo = {
      name: invite.clientName,
      email: invite.email,
    }

    return NextResponse.json({
      project,
      tasks,
      documents,
      milestones,
      clientInfo,
    })
  } catch (error) {
    console.error('Portal GET error:', error)
    return NextResponse.json(
      { error: "Erreur lors du chargement du portail" },
      { status: 500 }
    )
  }
}
