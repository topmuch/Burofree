/**
 * GET  /api/roles  — List all roles with their permissions
 * POST /api/roles  — Create a custom role (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { invalidateAllPermissionCaches } from '@/features/security/rbac/checker'
import { z } from 'zod'

// ─── Validation ──────────────────────────────────────────────────────────

const createRoleSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, 'Le slug doit contenir uniquement des lettres minuscules, chiffres, tirets et underscores'),
  name: z.string().min(1, 'Le nom est requis').max(100),
  description: z.string().max(500).optional(),
  level: z.number().int().min(1).max(99, 'Les rôles personnalisés ne peuvent pas dépasser le niveau 99').default(30),
  permissionSlugs: z.array(z.string().min(1)).min(1, 'Au moins une permission est requise').default([]),
})

// ─── Helpers ─────────────────────────────────────────────────────────────

async function requireAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === 'admin' || user?.role === 'superadmin'
}

// ─── GET ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

  // Rate limit
  const rlId = getRateLimitIdentifier(req, user.id)
  const rl = checkRateLimit(rlId, DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining, rl.retryAfterMs) },
    )
  }

  const roles = await db.role.findMany({
    orderBy: { level: 'desc' },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
      _count: {
        select: { teamMembers: true },
      },
    },
  })

  const formatted = roles.map(role => ({
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    level: role.level,
    isDefault: role.isDefault,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.rolePermissions.map(rp => ({
      id: rp.permission.id,
      slug: rp.permission.slug,
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description,
    })),
    membersCount: role._count.teamMembers,
  }))

  return NextResponse.json(
    { roles: formatted },
    { headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining) },
  )
}

// ─── POST ────────────────────────────────────────────────────────────────

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

  const parsed = createRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { slug, name, description, level, permissionSlugs } = parsed.data

  // Check slug uniqueness
  const existing = await db.role.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: `Un rôle avec le slug "${slug}" existe déjà` }, { status: 409 })
  }

  // Validate permission slugs
  const validPermissions = await db.permission.findMany({
    where: { slug: { in: permissionSlugs } },
  })
  if (validPermissions.length !== permissionSlugs.length) {
    const found = new Set(validPermissions.map(p => p.slug))
    const missing = permissionSlugs.filter(s => !found.has(s))
    return NextResponse.json(
      { error: `Permissions introuvables: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  // Create role
  const role = await db.role.create({
    data: {
      slug,
      name,
      description: description || null,
      level,
      isDefault: false,
      rolePermissions: {
        create: validPermissions.map(p => ({
          permissionId: p.id,
        })),
      },
    },
    include: {
      rolePermissions: { include: { permission: true } },
    },
  })

  // Invalidate all permission caches defensively (new role could affect future default role lookups)
  invalidateAllPermissionCaches()

  return NextResponse.json(
    {
      role: {
        id: role.id,
        slug: role.slug,
        name: role.name,
        description: role.description,
        level: role.level,
        isDefault: role.isDefault,
        permissions: role.rolePermissions.map(rp => ({
          id: rp.permission.id,
          slug: rp.permission.slug,
          resource: rp.permission.resource,
          action: rp.permission.action,
        })),
      },
    },
    { status: 201, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining) },
  )
}
