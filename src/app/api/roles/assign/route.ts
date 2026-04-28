/**
 * POST /api/roles/assign — Assign role to team member (admin only)
 *
 * Body: { userId: string, roleId: string, teamId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { logAudit } from '@/features/security/audit/enhanced-logger'
import { invalidatePermissionCache } from '@/features/security/rbac/checker'
import { z } from 'zod'

// ─── Validation ──────────────────────────────────────────────────────────

const assignRoleSchema = z.object({
  userId: z.string().min(1, "L'ID utilisateur est requis"),
  roleId: z.string().min(1, "L'ID du rôle est requis"),
  teamId: z.string().min(1, "L'ID de l'équipe est requis"),
})

// ─── Helpers ─────────────────────────────────────────────────────────────

async function requireAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === 'admin' || user?.role === 'superadmin'
}

// ─── Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

  // Admin only
  const isAdmin = await requireAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Accès refusé. Droits administrateur requis.' }, { status: 403 })
  }

  // Rate limit
  const rlId = getRateLimitIdentifier(req, user.id)
  const rl = checkRateLimit(rlId, DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining, rl.retryAfterMs) },
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = assignRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { userId, roleId, teamId } = parsed.data

  // Verify team membership
  const membership = await db.teamMember.findFirst({
    where: { userId, teamId },
  })
  if (!membership) {
    return NextResponse.json(
      { error: "L'utilisateur n'est pas membre de cette équipe" },
      { status: 404 },
    )
  }

  // Verify role exists
  const role = await db.role.findUnique({ where: { id: roleId } })
  if (!role) {
    return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
  }

  // Assign role
  await db.teamMember.update({
    where: { id: membership.id },
    data: { roleId },
  })

  // Invalidate permission cache
  invalidatePermissionCache(userId)

  // Audit log
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
  await logAudit({
    userId: user.id,
    teamId,
    action: 'role.assign',
    target: 'teamMember',
    targetId: membership.id,
    metadata: { assignedUserId: userId, roleId, roleSlug: role.slug },
    ip: ip || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  })

  return NextResponse.json(
    {
      message: `Rôle "${role.name}" assigné avec succès`,
      teamMember: {
        id: membership.id,
        userId,
        teamId,
        roleId,
        roleSlug: role.slug,
      },
    },
    { headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining) },
  )
}
