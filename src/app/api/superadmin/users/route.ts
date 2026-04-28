/**
 * GET  /api/superadmin/users — List/search users with cursor-based pagination.
 * POST /api/superadmin/users — Bulk actions on users (suspend, unsuspend, etc.).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { userSearchSchema, userBulkActionSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { invalidatePermissionCache } from '@/features/security/rbac/checker'

export async function GET(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = userSearchSchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { search, status, plan, sortBy, sortOrder, cursor, limit } = parsed.data

    // Build where clause
    const where: Prisma.UserWhereInput = {}

    // Search by email or name
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ]
    }

    // Filter by status
    if (status === 'active') {
      where.suspendedAt = null
    } else if (status === 'suspended') {
      where.suspendedAt = { not: null }
    }

    // Filter by plan (subscription status)
    if (plan && plan !== 'all') {
      where.subscriptions = {
        some: {
          status: plan === 'pro' ? 'active' : plan === 'enterprise' ? 'active' : undefined,
          stripePriceId: plan === 'pro'
            ? { contains: 'pro' }
            : plan === 'enterprise'
              ? { contains: 'enterprise' }
              : undefined,
        },
      }
      if (plan === 'free') {
        where.subscriptions = { none: {} }
      }
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor }
    }

    // Sorting
    const orderBy: Prisma.UserOrderByWithRelationInput = {}
    if (sortBy === 'lastActivity') {
      orderBy.sessions = { _count: sortOrder }
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [users, totalCount] = await Promise.all([
      db.user.findMany({
        where,
        orderBy,
        take: limit + 1,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          suspendedAt: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sessions: true,
              subscriptions: true,
              projects: true,
              invoices: true,
            },
          },
          subscriptions: {
            where: { status: { in: ['active', 'trialing'] } },
            select: { status: true, stripePriceId: true, currentPeriodEnd: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      db.user.count({ where }),
    ])

    // Check if there are more results
    const hasMore = users.length > limit
    const trimmedUsers = hasMore ? users.slice(0, limit) : users
    const nextCursor = hasMore ? trimmedUsers[trimmedUsers.length - 1].id : null

    await logAdminAction(admin.id, 'admin.users_list', 'user', null, { search, status, plan, limit }, req)

    return NextResponse.json({
      users: trimmedUsers,
      pagination: {
        total: totalCount,
        limit,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    console.error('[SuperAdmin Users GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la liste des utilisateurs.' },
      { status: 500 }
    )
  }
}

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

    const parsed = userBulkActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { userIds, action, reason } = parsed.data
    const results: Array<{ userId: string; success: boolean; error?: string }> = []

    for (const userId of userIds) {
      try {
        // Prevent self-action
        if (userId === admin.id) {
          results.push({ userId, success: false, error: 'Action sur soi-même interdite.' })
          continue
        }

        // Verify user exists
        const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } })
        if (!user) {
          results.push({ userId, success: false, error: 'Utilisateur introuvable.' })
          continue
        }

        // Prevent action on other superadmins
        if (user.role === 'superadmin' && action !== 'force_logout') {
          results.push({ userId, success: false, error: 'Action interdite sur un autre superadmin.' })
          continue
        }

        switch (action) {
          case 'suspend': {
            await db.user.update({
              where: { id: userId },
              data: { suspendedAt: new Date() },
            })
            // End all active sessions
            await db.session.deleteMany({ where: { userId } })
            invalidatePermissionCache(userId)
            results.push({ userId, success: true })
            break
          }

          case 'unsuspend': {
            await db.user.update({
              where: { id: userId },
              data: { suspendedAt: null },
            })
            invalidatePermissionCache(userId)
            results.push({ userId, success: true })
            break
          }

          case 'force_logout': {
            await db.session.deleteMany({ where: { userId } })
            results.push({ userId, success: true })
            break
          }

          case 'reset_2fa': {
            await db.user.update({
              where: { id: userId },
              data: { twoFactorEnabled: false, twoFactorSecret: null },
            })
            results.push({ userId, success: true })
            break
          }

          case 'delete': {
            await db.user.delete({ where: { id: userId } })
            invalidatePermissionCache(userId)
            results.push({ userId, success: true })
            break
          }

          case 'anonymize': {
            // RGPD anonymization: replace PII with anonymized placeholder
            await db.user.update({
              where: { id: userId },
              data: {
                email: `anonymized-${userId}@deleted.maellis`,
                name: 'Utilisateur supprimé',
                avatar: null,
                profession: null,
                passwordHash: null,
                twoFactorEnabled: false,
                twoFactorSecret: null,
                suspendedAt: new Date(),
              },
            })
            // End all sessions
            await db.session.deleteMany({ where: { userId } })
            invalidatePermissionCache(userId)
            results.push({ userId, success: true })
            break
          }

          default:
            results.push({ userId, success: false, error: 'Action non reconnue.' })
        }
      } catch (err) {
        results.push({ userId, success: false, error: err instanceof Error ? err.message : 'Erreur inconnue.' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    await logAdminAction(admin.id, `admin.users_bulk_${action}`, 'user', null, {
      userIds,
      reason,
      successCount,
      failureCount,
      results,
    }, req)

    return NextResponse.json({
      action,
      successCount,
      failureCount,
      results,
    })
  } catch (error) {
    console.error('[SuperAdmin Users POST] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'action en masse sur les utilisateurs.' },
      { status: 500 }
    )
  }
}
