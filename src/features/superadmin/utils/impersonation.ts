/**
 * Impersonation Manager — Secure user impersonation for superadmins.
 *
 * Security guarantees:
 * - Ephemeral JWT token with 15-min max expiry
 * - Impersonation banner visible at all times
 * - Full audit trail of impersonation sessions
 * - Admin can only end impersonation, not extend it
 * - Original admin session is preserved
 */

import { db } from '@/lib/db'
import { sign, verify } from '@/lib/jwt-simple'
import { nanoid } from 'nanoid'

const IMPERSONATION_MAX_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export interface ImpersonationToken {
  adminUserId: string
  targetUserId: string
  sessionId: string
  exp: number
  iat: number
}

/**
 * Create an impersonation session.
 * Returns a JWT token that the admin uses to act as the target user.
 */
export async function startImpersonation(
  adminUserId: string,
  targetUserId: string,
  reason: string | null,
  ip: string | null
): Promise<{ token: string; expiresAt: Date } | null> {
  // Verify admin has superadmin role
  const admin = await db.user.findUnique({
    where: { id: adminUserId },
    select: { role: true, twoFactorEnabled: true },
  })

  if (!admin || admin.role !== 'superadmin') return null

  // Verify target user exists and is NOT a superadmin (prevent impersonating other admins)
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true },
  })

  if (!target) return null
  if (target.role === 'superadmin') return null // Cannot impersonate other superadmins

  const expiresAt = new Date(Date.now() + IMPERSONATION_MAX_DURATION_MS)
  const sessionId = nanoid(16)

  // Create impersonation session record
  await db.impersonationSession.create({
    data: {
      adminUserId,
      targetUserId,
      token: sessionId, // Store the session ID; JWT is derived
      reason,
      ip,
      expiresAt,
    },
  })

  // Create ephemeral JWT using our built-in jwt-simple
  const payload: Record<string, unknown> = {
    adminUserId,
    targetUserId,
    sessionId,
  }

  const token = sign(payload, { expiresIn: '15m' })

  return { token, expiresAt }
}

/**
 * Verify an impersonation token.
 * Returns the decoded payload if valid, null otherwise.
 */
export function verifyImpersonationToken(token: string): ImpersonationToken | null {
  try {
    const decoded = verify(token) as unknown as ImpersonationToken

    // Check if token is expired (double-check)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null

    return decoded
  } catch {
    return null
  }
}

/**
 * End an impersonation session.
 */
export async function endImpersonation(sessionId: string): Promise<boolean> {
  try {
    const session = await db.impersonationSession.findUnique({
      where: { token: sessionId },
    })

    if (!session) return false

    await db.impersonationSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    })

    return true
  } catch {
    return false
  }
}

/**
 * Check if a user is currently being impersonated.
 * Useful for showing the impersonation banner.
 */
export async function getActiveImpersonation(targetUserId: string): Promise<{
  isActive: boolean
  adminEmail: string | null
  expiresAt: Date | null
} | null> {
  const session = await db.impersonationSession.findFirst({
    where: {
      targetUserId,
      endedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!session) return null

  const admin = await db.user.findUnique({
    where: { id: session.adminUserId },
    select: { email: true },
  })

  return {
    isActive: true,
    adminEmail: admin?.email || null,
    expiresAt: session.expiresAt,
  }
}
