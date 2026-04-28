/**
 * GET    /api/roles/[id]  — Get role details with permissions
 * PUT    /api/roles/[id]  — Update role (add/remove permissions, admin only)
 * DELETE /api/roles/[id]  — Delete custom role (admin only, can't delete default roles)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { invalidatePermissionCache } from '@/features/security/rbac/checker'
import { z } from 'zod'

// ─── Validation ──────────────────────────────────────────────────────────

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  level: z.number().int().min(1).max(99).optional(),
  addPermissions: z.array(z.string().min(1)).optional(),
  removePermissions: z.array(z.string().min(1)).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────────────

async function requireAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === 'admin' || user?.role === 'superadmin'
}

// ─── GET ─────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params

  const role = await db.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
      _count: {
        select: { teamMembers: true },
      },
    },
  })

  if (!role) {
    return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
  }

  return NextResponse.json({
    role: {
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
    },
  }, {
    headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining),
  })
}

// ─── PUT ─────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

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

  const { id } = await params

  // Verify role exists
  const role = await db.role.findUnique({ where: { id } })
  if (!role) {
    return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { name, description, level, addPermissions, removePermissions } = parsed.data

  // Update basic fields
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (level !== undefined) updateData.level = level

  if (Object.keys(updateData).length > 0) {
    await db.role.update({ where: { id }, data: updateData })
  }

  // Add permissions
  if (addPermissions && addPermissions.length > 0) {
    const permsToAdd = await db.permission.findMany({
      where: { slug: { in: addPermissions } },
    })
    for (const perm of permsToAdd) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: id, permissionId: perm.id },
      })
    }
  }

  // Remove permissions
  if (removePermissions && removePermissions.length > 0) {
    const permsToRemove = await db.permission.findMany({
      where: { slug: { in: removePermissions } },
    })
    const permIds = permsToRemove.map(p => p.id)
    if (permIds.length > 0) {
      await db.rolePermission.deleteMany({
        where: { roleId: id, permissionId: { in: permIds } },
      })
    }
  }

  // Invalidate permission cache for users with this role
  const membersWithRole = await db.teamMember.findMany({
    where: { roleId: id },
    select: { userId: true },
  })
  for (const member of membersWithRole) {
    invalidatePermissionCache(member.userId)
  }

  // Return updated role
  const updatedRole = await db.role.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
    },
  })

  return NextResponse.json({
    role: {
      id: updatedRole!.id,
      slug: updatedRole!.slug,
      name: updatedRole!.name,
      description: updatedRole!.description,
      level: updatedRole!.level,
      isDefault: updatedRole!.isDefault,
      permissions: updatedRole!.rolePermissions.map(rp => ({
        id: rp.permission.id,
        slug: rp.permission.slug,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    },
  }, {
    headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining),
  })
}

// ─── DELETE ──────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

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

  const { id } = await params

  // Verify role exists
  const role = await db.role.findUnique({ where: { id } })
  if (!role) {
    return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
  }

  // Cannot delete default roles
  if (role.isDefault) {
    return NextResponse.json(
      { error: 'Impossible de supprimer un rôle par défaut' },
      { status: 403 },
    )
  }

  // Check if role is assigned to any team members
  const assignedMembers = await db.teamMember.findMany({
    where: { roleId: id },
    select: { userId: true },
  })
  if (assignedMembers.length > 0) {
    return NextResponse.json(
      { error: `Ce rôle est assigné à ${assignedMembers.length} membre(s). Réassignez-les avant de supprimer le rôle.` },
      { status: 409 },
    )
  }

  // Delete role (cascades to rolePermissions)
  await db.role.delete({ where: { id } })

  // Invalidate permission cache for any users who previously had this role
  // (defensive — the check above should prevent this, but guards against race conditions)
  for (const member of assignedMembers) {
    invalidatePermissionCache(member.userId)
  }

  return NextResponse.json(
    { message: `Rôle "${role.name}" supprimé` },
    { headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining) },
  )
}
