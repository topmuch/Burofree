/**
 * RBAC Permission Checker — Burofree
 *
 * Provides runtime permission checking using:
 * - User's global role (superadmin → all permissions)
 * - Team membership + role-based permissions
 * - Default role fallback
 * - In-memory permission cache (per request lifecycle)
 */

import { db } from '@/lib/db'
import { PERMISSIONS } from './permissions'

// ─── In-memory permission cache ──────────────────────────────────────────

const permissionCache = new Map<string, Set<string>>()

/**
 * Check if a user has a specific permission.
 * Uses role hierarchy and team membership.
 */
export async function hasPermission(
  userId: string,
  permissionSlug: string,
  teamId?: string,
): Promise<boolean> {
  const cacheKey = `${userId}:${teamId || 'global'}`
  const cached = permissionCache.get(cacheKey)
  if (cached) return cached.has(permissionSlug)

  const permissions = await loadUserPermissions(userId, teamId)
  permissionCache.set(cacheKey, permissions)
  return permissions.has(permissionSlug)
}

/**
 * Load all permissions for a user (from roles + team membership).
 */
async function loadUserPermissions(userId: string, teamId?: string): Promise<Set<string>> {
  const permissions = new Set<string>()

  // 1. Check if user is superadmin
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role === 'superadmin') {
    return new Set(Object.keys(PERMISSIONS))
  }

  // 2. If team context, load permissions from team role
  if (teamId) {
    const teamMember = await db.teamMember.findFirst({
      where: { userId, teamId, status: 'active' },
      include: {
        roleRef: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    })

    if (teamMember?.roleRef) {
      for (const rp of teamMember.roleRef.rolePermissions) {
        permissions.add(rp.permission.slug)
      }
    }

    // Owner denormalized role → all permissions
    if (teamMember?.role === 'owner') {
      return new Set(Object.keys(PERMISSIONS))
    }
  }

  // 3. Default role permissions (for users without specific team role)
  const defaultRole = await db.role.findFirst({
    where: { isDefault: true },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  })
  if (defaultRole) {
    for (const rp of defaultRole.rolePermissions) {
      permissions.add(rp.permission.slug)
    }
  }

  // 4. Also accumulate permissions from ALL team memberships
  const allTeamMemberships = await db.teamMember.findMany({
    where: { userId, status: 'active' },
    include: {
      roleRef: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  })

  for (const membership of allTeamMemberships) {
    // Owner gets all permissions
    if (membership.role === 'owner') {
      return new Set(Object.keys(PERMISSIONS))
    }

    if (membership.roleRef) {
      for (const rp of membership.roleRef.rolePermissions) {
        permissions.add(rp.permission.slug)
      }
    }
  }

  return permissions
}

/**
 * Invalidate permission cache for a user (call when roles change).
 */
export function invalidatePermissionCache(userId: string) {
  for (const key of permissionCache.keys()) {
    if (key.startsWith(userId)) {
      permissionCache.delete(key)
    }
  }
}

/**
 * Require a permission — returns true if authorized, false otherwise.
 */
export async function requirePermission(
  userId: string,
  permissionSlug: string,
  teamId?: string,
): Promise<boolean> {
  return hasPermission(userId, permissionSlug, teamId)
}

/**
 * Get all permissions for a user (useful for UI display).
 */
export async function getUserPermissions(
  userId: string,
  teamId?: string,
): Promise<Set<string>> {
  const cacheKey = `${userId}:${teamId || 'global'}`
  const cached = permissionCache.get(cacheKey)
  if (cached) return cached

  const permissions = await loadUserPermissions(userId, teamId)
  permissionCache.set(cacheKey, permissions)
  return permissions
}
