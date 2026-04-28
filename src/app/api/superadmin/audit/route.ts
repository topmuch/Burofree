/**
 * GET /api/superadmin/audit — Search audit logs with cursor-based pagination.
 *
 * Supports filtering by action, userId, target entity, and date range.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { auditLogSearchSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = auditLogSearchSchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { action, userId, target, dateFrom, dateTo, cursor, limit } = parsed.data

    // Build where clause
    const where: Prisma.SuperAdminAuditLogWhereInput = {}

    if (action) {
      where.action = { contains: action }
    }

    if (userId) {
      where.userId = userId
    }

    if (target) {
      where.target = target
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo)
      }
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor }
    }

    const [logs, totalCount] = await Promise.all([
      db.superAdminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          userId: true,
          action: true,
          target: true,
          targetId: true,
          metadata: true,
          ip: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      db.superAdminAuditLog.count({ where }),
    ])

    const hasMore = logs.length > limit
    const trimmedLogs = hasMore ? logs.slice(0, limit) : logs
    const nextCursor = hasMore ? trimmedLogs[trimmedLogs.length - 1].id : null

    // Enrich with admin info
    const adminIds = [...new Set(trimmedLogs.map(l => l.userId))]
    const admins = await db.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, email: true, name: true },
    })
    const adminMap = new Map(admins.map(a => [a.id, a]))

    const enrichedLogs = trimmedLogs.map(log => ({
      ...log,
      metadata: safeJsonParse(log.metadata),
      admin: adminMap.get(log.userId) || null,
    }))

    await logAdminAction(admin.id, 'admin.audit_search', 'audit', null, {
      action,
      userId,
      target,
      dateFrom,
      dateTo,
      resultsCount: totalCount,
    }, req)

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        total: totalCount,
        limit,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    console.error('[SuperAdmin Audit GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des journaux d\'audit.' },
      { status: 500 }
    )
  }
}

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str || '{}')
  } catch {
    return {}
  }
}
