/**
 * POST   /api/superadmin/impersonate — Start an impersonation session.
 * DELETE /api/superadmin/impersonate — End an impersonation session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { impersonateStartSchema, impersonateEndSchema } from '@/lib/validations/superadmin'
import { startImpersonation, endImpersonation } from '@/features/superadmin/utils/impersonation'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = impersonateStartSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { targetUserId, reason } = parsed.data

    // Prevent impersonating another superadmin
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, suspendedAt: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur cible introuvable.' },
        { status: 404 }
      )
    }

    if (targetUser.role === 'superadmin') {
      return NextResponse.json(
        { error: 'L\'usurpation d\'identité d\'un autre superadmin est interdite.' },
        { status: 403 }
      )
    }

    if (targetUser.suspendedAt) {
      return NextResponse.json(
        { error: 'Impossible d\'usurper l\'identité d\'un utilisateur suspendu.' },
        { status: 400 }
      )
    }

    // Check if there's already an active impersonation by this admin
    const activeImpersonation = await db.impersonationSession.findFirst({
      where: {
        adminUserId: admin.id,
        endedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (activeImpersonation) {
      return NextResponse.json(
        { error: 'Vous avez déjà une session d\'usurpation active. Veuillez d\'abord la terminer.' },
        { status: 409 }
      )
    }

    // Get IP from request
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null

    // Start impersonation
    const result = await startImpersonation(admin.id, targetUserId, reason, ip)

    if (!result) {
      return NextResponse.json(
        { error: 'Impossible de démarrer la session d\'usurpation d\'identité.' },
        { status: 500 }
      )
    }

    await logAdminAction(admin.id, 'admin.impersonate_start', 'user', targetUserId, {
      targetEmail: targetUser.email,
      targetName: targetUser.name,
      reason,
      expiresAt: result.expiresAt.toISOString(),
    }, req)

    return NextResponse.json({
      message: `Session d'usurpation d'identité démarrée pour ${targetUser.email}.`,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[SuperAdmin Impersonate POST] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du démarrage de la session d\'usurpation d\'identité.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = impersonateEndSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { sessionId } = parsed.data

    // Verify the session belongs to this admin
    const session = await db.impersonationSession.findUnique({
      where: { token: sessionId },
      select: { id: true, adminUserId: true, targetUserId: true, endedAt: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session d\'usurpation introuvable.' },
        { status: 404 }
      )
    }

    if (session.adminUserId !== admin.id) {
      return NextResponse.json(
        { error: 'Cette session d\'usurpation ne vous appartient pas.' },
        { status: 403 }
      )
    }

    if (session.endedAt) {
      return NextResponse.json(
        { error: 'Cette session d\'usurpation est déjà terminée.' },
        { status: 400 }
      )
    }

    const success = await endImpersonation(sessionId)

    if (!success) {
      return NextResponse.json(
        { error: 'Impossible de terminer la session d\'usurpation.' },
        { status: 500 }
      )
    }

    await logAdminAction(admin.id, 'admin.impersonate_end', 'user', session.targetUserId, {
      sessionId: session.id,
    }, req)

    return NextResponse.json({
      message: 'Session d\'usurpation d\'identité terminée.',
    })
  } catch (error) {
    console.error('[SuperAdmin Impersonate DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la fin de la session d\'usurpation d\'identité.' },
      { status: 500 }
    )
  }
}
