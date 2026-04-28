/**
 * Audit Logger — Maellis
 *
 * Central audit logging module. Re-exports the enhanced audit logger
 * and provides convenience helpers used by other security modules.
 */

import { NextRequest } from 'next/server'
import { logAudit, type AuditLogEntry } from './enhanced-logger'

// ─── Re-exports ──────────────────────────────────────────────────────────

export { logAudit, queryAuditLogs, detectAnomalies } from './enhanced-logger'
export type { AuditAction, AuditLogEntry, QueryAuditLogsParams, QueryAuditLogsResult } from './enhanced-logger'

/**
 * Alias for `logAudit` — used by existing modules (two-factor service, etc.)
 */
export const createAuditLog = logAudit

/**
 * Alias for `logAudit` — used by security modules (GDPR, encryption, etc.)
 * Accepts the same parameters as `logAudit`.
 */
export async function logSecurityAction(entry: AuditLogEntry) {
  return logAudit(entry)
}

/**
 * Extract client IP from a Next.js request.
 * Checks X-Forwarded-For, X-Real-IP headers in order.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
}

/**
 * Extract User-Agent from a Next.js request.
 */
export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown'
}
