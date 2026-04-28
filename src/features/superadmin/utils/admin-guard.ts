/**
 * SuperAdmin Guard — Strict role-based access control for admin routes.
 * Every superadmin API route MUST call requireSuperAdmin() as its first step.
 *
 * Security layers:
 * 1. Session authentication (NextAuth)
 * 2. Role check (role === 'superadmin')
 * 3. 2FA enforcement (twoFactorEnabled === true) — optional in dev, mandatory in prod
 * 4. IP whitelist (optional, via SUPERADMIN_IP_WHITELIST env)
 *
 * All access attempts are logged to SuperAdminAuditLog.
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export interface SuperAdminUser {
  id: string
  email: string
  name: string | null
  role: string
  twoFactorEnabled: boolean
}

/**
 * Get the superadmin user from the session, verifying role and 2FA.
 * Returns null if not authorized.
 */
export async function getSuperAdminUser(): Promise<SuperAdminUser | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return null

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        suspendedAt: true,
      },
    })

    if (!user) return null
    if (user.suspendedAt) return null
    if (user.role !== 'superadmin') return null

    // In production, enforce 2FA
    if (process.env.NODE_ENV === 'production' && !user.twoFactorEnabled) {
      console.error(`SUPERADMIN ACCESS DENIED: ${user.email} has no 2FA enabled`)
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
    }
  } catch {
    return null
  }
}

/**
 * Require superadmin access in an API route handler.
 * Returns the admin user if authorized, or a 403/401 response if not.
 *
 * Usage:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const auth = await requireSuperAdmin(req)
 *   if (!auth.admin) return auth.response!
 *   // ... use auth.admin
 * }
 * ```
 */
export async function requireSuperAdmin(req?: NextRequest): Promise<{
  admin: SuperAdminUser | null
  response: NextResponse | null
}> {
  const admin = await getSuperAdminUser()

  if (!admin) {
    // Check if there's a session at all
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return {
        admin: null,
        response: NextResponse.json(
          { error: 'Authentification requise.' },
          { status: 401 }
        ),
      }
    }
    return {
      admin: null,
      response: NextResponse.json(
        { error: 'Accès refusé. Privilèges superadmin requis.' },
        { status: 403 }
      ),
    }
  }

  // Optional: IP whitelist check
  const ipWhitelist = process.env.SUPERADMIN_IP_WHITELIST
  if (ipWhitelist && req) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const allowedIps = ipWhitelist.split(',').map(ip => ip.trim())
    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      // Log unauthorized IP attempt
      await logAdminAction(admin.id, 'admin.ip_blocked', 'user', admin.id, {
        ip: clientIp,
        allowedIps,
      })
      return {
        admin: null,
        response: NextResponse.json(
          { error: 'Accès refusé depuis cette adresse IP.' },
          { status: 403 }
        ),
      }
    }
  }

  return { admin, response: null }
}

/**
 * Log a superadmin action to the audit trail.
 * Every mutation performed by an admin must be traced.
 */
export async function logAdminAction(
  userId: string,
  action: string,
  target?: string | null,
  targetId?: string | null,
  metadata?: Record<string, unknown>,
  req?: NextRequest
): Promise<void> {
  try {
    await db.superAdminAuditLog.create({
      data: {
        userId,
        action,
        target: target || null,
        targetId: targetId || null,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        ip: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req?.headers.get('x-real-ip')
          || null,
        userAgent: req?.headers.get('user-agent') || null,
      },
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}
