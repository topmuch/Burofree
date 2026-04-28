/**
 * Enhanced Audit Logging System — Burofree
 *
 * Wraps the basic AuditLog model with:
 * - Structured action types
 * - Query with filters & pagination
 * - Anomaly detection (multiple IPs, bulk exports, bulk deletes)
 */

import { db } from '@/lib/db'

// ─── Audit Action Types ──────────────────────────────────────────────────

export type AuditAction =
  | 'user.login' | 'user.logout' | 'user.register' | 'user.update' | 'user.2fa.enable' | 'user.2fa.disable'
  | 'task.create' | 'task.update' | 'task.delete'
  | 'project.create' | 'project.update' | 'project.delete'
  | 'invoice.create' | 'invoice.update' | 'invoice.delete' | 'invoice.send' | 'invoice.export'
  | 'email.send' | 'email.read' | 'email.delete'
  | 'document.create' | 'document.update' | 'document.delete' | 'document.export'
  | 'contract.create' | 'contract.update' | 'contract.delete'
  | 'data.export' | 'data.import' | 'data.delete' | 'data.reset'
  | 'gdpr.export' | 'gdpr.delete.request' | 'gdpr.delete.confirm' | 'gdpr.delete.cancel'
  | 'consent.update' | 'consent.grant' | 'consent.revoke'
  | 'role.assign' | 'role.revoke' | 'permission.check'
  | 'encryption.rotate' | 'encryption.status'
  | 'security.alert' | 'security.login.suspicious' | 'security.brute_force'
  | 'team.create' | 'team.member.invite' | 'team.member.remove' | 'team.member.role_change'
  | 'settings.update' | 'settings.security'

export interface AuditLogEntry {
  userId: string
  teamId?: string
  action: AuditAction | string
  target?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

// ─── Core: logAudit ──────────────────────────────────────────────────────

/**
 * Create an audit log entry in the database.
 */
export async function logAudit(entry: AuditLogEntry) {
  return db.auditLog.create({
    data: {
      userId: entry.userId,
      teamId: entry.teamId || null,
      action: entry.action,
      target: entry.target || null,
      targetId: entry.targetId || null,
      metadata: JSON.stringify(entry.metadata || {}),
      ip: entry.ip || null,
      userAgent: entry.userAgent || null,
    },
  })
}

// ─── Query ───────────────────────────────────────────────────────────────

export interface QueryAuditLogsParams {
  userId?: string
  teamId?: string
  action?: string
  target?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface QueryAuditLogsResult {
  logs: Awaited<ReturnType<typeof db.auditLog.findMany>>
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Query audit logs with filters and pagination.
 */
export async function queryAuditLogs(params: QueryAuditLogsParams): Promise<QueryAuditLogsResult> {
  const { userId, teamId, action, target, startDate, endDate, page = 1, limit = 50 } = params

  const where: Record<string, any> = {}
  if (userId) where.userId = userId
  if (teamId) where.teamId = teamId
  if (action) where.action = { contains: action }
  if (target) where.target = target
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    }
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ])

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ─── Anomaly Detection ───────────────────────────────────────────────────

/**
 * Detect anomalous behavior and create security alerts.
 *
 * Checks:
 * 1. Multiple IPs for logins within 1 hour (≥ 3 unique IPs → high alert)
 * 2. Bulk export operations within 1 hour (≥ 5 → medium alert)
 * 3. Bulk delete operations within 1 hour (≥ 10 → high alert)
 */
export async function detectAnomalies(userId: string, action: string, ip: string) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // 1. Multiple IPs in short time (suspicious login pattern)
  if (action === 'user.login') {
    const recentLogins = await db.auditLog.findMany({
      where: {
        userId,
        action: 'user.login',
        createdAt: { gte: oneHourAgo },
      },
      select: { ip: true },
    })

    const uniqueIPs = new Set(recentLogins.map(l => l.ip).filter(Boolean))
    if (uniqueIPs.size >= 3) {
      await db.securityAlert.create({
        data: {
          userId,
          type: 'multiple_ip_login',
          severity: 'high',
          description: `Login from ${uniqueIPs.size} different IPs in 1 hour`,
          metadata: JSON.stringify({ ips: Array.from(uniqueIPs), count: uniqueIPs.size }),
          ipAddress: ip,
        },
      })
    }
  }

  // 2. Bulk export operations
  if (action === 'data.export' || action === 'invoice.export') {
    const recentExports = await db.auditLog.count({
      where: {
        userId,
        action: { in: ['data.export', 'invoice.export'] },
        createdAt: { gte: oneHourAgo },
      },
    })

    if (recentExports >= 5) {
      await db.securityAlert.create({
        data: {
          userId,
          type: 'bulk_export',
          severity: 'medium',
          description: `${recentExports} export operations in 1 hour`,
          metadata: JSON.stringify({ count: recentExports }),
          ipAddress: ip,
        },
      })
    }
  }

  // 3. Bulk delete operations
  if (action.includes('delete')) {
    const recentDeletes = await db.auditLog.count({
      where: {
        userId,
        action: { contains: 'delete' },
        createdAt: { gte: oneHourAgo },
      },
    })

    if (recentDeletes >= 10) {
      await db.securityAlert.create({
        data: {
          userId,
          type: 'bulk_delete',
          severity: 'high',
          description: `${recentDeletes} delete operations in 1 hour`,
          metadata: JSON.stringify({ count: recentDeletes }),
          ipAddress: ip,
        },
      })
    }
  }
}
