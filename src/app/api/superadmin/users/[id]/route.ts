/**
 * GET    /api/superadmin/users/[id] — Get user detail.
 * PATCH  /api/superadmin/users/[id] — Update user (name, role, suspendedAt).
 * DELETE /api/superadmin/users/[id] — Anonymize user (RGPD).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { userUpdateSchema, rgpdDeleteSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'
import { invalidatePermissionCache } from '@/features/security/rbac/checker'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        profession: true,
        timezone: true,
        role: true,
        twoFactorEnabled: true,
        suspendedAt: true,
        createdAt: true,
        updatedAt: true,
        stripeCustomerId: true,
        _count: {
          select: {
            tasks: true,
            projects: true,
            invoices: true,
            timeEntries: true,
            documents: true,
            sessions: true,
            emailAccounts: true,
            notifications: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            stripeSubscriptionId: true,
            stripePriceId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            trialStart: true,
            trialEnd: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        modules: {
          where: { status: 'active' },
          select: {
            id: true,
            status: true,
            expiresAt: true,
            module: { select: { id: true, name: true, slug: true, price: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable.' },
        { status: 404 }
      )
    }

    // Recent activity (last 10 sessions)
    const recentSessions = await db.session.findMany({
      where: { userId: id },
      orderBy: { expires: 'desc' },
      take: 5,
      select: { id: true, expires: true },
    })

    // Active impersonation
    const activeImpersonation = await db.impersonationSession.findFirst({
      where: { targetUserId: id, endedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, adminUserId: true, reason: true, expiresAt: true, createdAt: true },
    })

    await logAdminAction(admin.id, 'admin.user_detail', 'user', id, undefined, req)

    return NextResponse.json({
      user,
      recentSessions,
      activeImpersonation,
    })
  } catch (error) {
    console.error('[SuperAdmin User GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du détail utilisateur.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const { id } = await params

    // Prevent self-modification of role
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier votre propre compte depuis ce panneau.' },
        { status: 403 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = userUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify user exists
    const existing = await db.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable.' },
        { status: 404 }
      )
    }

    // Prevent role escalation to superadmin
    if (data.role === 'superadmin') {
      return NextResponse.json(
        { error: 'L\'attribution du rôle superadmin n\'est pas autorisée via cette route.' },
        { status: 403 }
      )
    }

    // If suspending, end all sessions
    if (data.suspendedAt !== undefined && data.suspendedAt !== null) {
      await db.session.deleteMany({ where: { userId: id } })
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        suspendedAt: true,
        twoFactorEnabled: true,
        updatedAt: true,
      },
    })

    await logAdminAction(admin.id, 'admin.user_update', 'user', id, {
      previousRole: existing.role,
      changes: data,
    }, req)

    // Invalidate permission cache — role or suspension status may have changed
    invalidatePermissionCache(id)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[SuperAdmin User PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const { id } = await params

    // Prevent self-deletion
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas anonymiser votre propre compte.' },
        { status: 403 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = rgpdDeleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { reason, confirmEmail } = parsed.data

    // Verify user exists and email matches
    const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } })
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable.' },
        { status: 404 }
      )
    }

    if (user.email !== confirmEmail) {
      return NextResponse.json(
        { error: 'L\'email de confirmation ne correspond pas.' },
        { status: 400 }
      )
    }

    if (user.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Anonymisation d\'un superadmin interdite.' },
        { status: 403 }
      )
    }

    // RGPD anonymization: replace all PII
    const anonymizedEmail = `anonymized-${user.id}@rgpd-deleted.burozen`

    await db.user.update({
      where: { id },
      data: {
        email: anonymizedEmail,
        name: 'Utilisateur anonymisé (RGPD)',
        avatar: null,
        profession: null,
        passwordHash: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        stripeCustomerId: null,
        stripeAccountId: null,
        suspendedAt: new Date(),
      },
    })

    // Invalidate permission cache — user status has changed (suspended)
    invalidatePermissionCache(id)

    // End all active sessions
    await db.session.deleteMany({ where: { userId: id } })
    // Remove OAuth accounts
    await db.account.deleteMany({ where: { userId: id } })

    await logAdminAction(admin.id, 'admin.user_anonymize_rgpd', 'user', id, {
      previousEmail: user.email,
      reason,
    }, req)

    return NextResponse.json({
      message: 'Utilisateur anonymisé conformément au RGPD.',
      anonymizedEmail,
    })
  } catch (error) {
    console.error('[SuperAdmin User DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'anonymisation RGPD de l\'utilisateur.' },
      { status: 500 }
    )
  }
}
