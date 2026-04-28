/**
 * RBAC Seed — Burofree
 *
 * Seeds default roles and permissions into the database.
 * Idempotent: uses upsert for both permissions and role-permission assignments.
 *
 * Role hierarchy:
 * - SuperAdmin (level 100): all permissions
 * - Owner      (level 80):  all permissions except billing:manage for platform
 * - Admin      (level 60):  task, project, invoice, email, document, time, team permissions
 * - Member     (level 40):  task, project (create/read/update), invoice:read, email, document, time
 * - Viewer     (level 20):  read-only permissions
 * - Guest      (level 10):  project:read only
 */

import { db } from '@/lib/db'
import { PERMISSIONS, type PermissionSlug } from './permissions'

// ─── Role definitions ────────────────────────────────────────────────────

interface RoleDefinition {
  slug: string
  name: string
  description: string
  level: number
  isDefault: boolean
  permissions: PermissionSlug[]
}

const ROLES: RoleDefinition[] = [
  {
    slug: 'superadmin',
    name: 'SuperAdmin',
    description: 'Contrôle total sur la plateforme',
    level: 100,
    isDefault: false,
    permissions: Object.keys(PERMISSIONS) as PermissionSlug[],
  },
  {
    slug: 'owner',
    name: 'Propriétaire',
    description: "Contrôle total sur l'équipe (sauf facturation plateforme)",
    level: 80,
    isDefault: false,
    permissions: (
      Object.keys(PERMISSIONS) as PermissionSlug[]
    ).filter(p => p !== 'billing:manage'),
  },
  {
    slug: 'admin',
    name: 'Administrateur',
    description: "Gère l'équipe et les ressources, pas la facturation",
    level: 60,
    isDefault: false,
    permissions: [
      'task:create', 'task:read', 'task:update', 'task:delete', 'task:manage',
      'project:create', 'project:read', 'project:update', 'project:delete', 'project:manage',
      'invoice:create', 'invoice:read', 'invoice:update', 'invoice:delete', 'invoice:export',
      'email:read', 'email:send', 'email:delete',
      'document:create', 'document:read', 'document:update', 'document:delete',
      'time:create', 'time:read', 'time:update', 'time:delete',
      'team:manage', 'team:invite', 'team:remove',
      'settings:read', 'settings:update',
    ] as PermissionSlug[],
  },
  {
    slug: 'member',
    name: 'Membre',
    description: 'Crée et modifie ses propres ressources',
    level: 40,
    isDefault: true,
    permissions: [
      'task:create', 'task:read', 'task:update',
      'project:create', 'project:read', 'project:update',
      'invoice:read',
      'email:read', 'email:send',
      'document:create', 'document:read', 'document:update',
      'time:create', 'time:read', 'time:update',
    ] as PermissionSlug[],
  },
  {
    slug: 'viewer',
    name: 'Observateur',
    description: 'Lecture seule sur toutes les ressources',
    level: 20,
    isDefault: false,
    permissions: [
      'task:read',
      'project:read',
      'invoice:read',
      'email:read',
      'document:read',
      'time:read',
      'settings:read',
    ] as PermissionSlug[],
  },
  {
    slug: 'guest',
    name: 'Invité',
    description: 'Lecture seule sur les projets assignés',
    level: 10,
    isDefault: false,
    permissions: [
      'project:read',
    ] as PermissionSlug[],
  },
]

// ─── Seed function ───────────────────────────────────────────────────────

export async function seedRolesAndPermissions() {
  // 1. Upsert all permissions
  for (const [slug, def] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({
      where: { slug },
      update: {
        resource: def.resource,
        action: def.action,
        description: def.description,
      },
      create: {
        slug,
        resource: def.resource,
        action: def.action,
        description: def.description,
      },
    })
  }

  // 2. Upsert all roles
  for (const role of ROLES) {
    await db.role.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description,
        level: role.level,
        isDefault: role.isDefault,
      },
      create: {
        slug: role.slug,
        name: role.name,
        description: role.description,
        level: role.level,
        isDefault: role.isDefault,
      },
    })
  }

  // 3. Assign permissions to roles (idempotent)
  for (const role of ROLES) {
    const dbRole = await db.role.findUnique({ where: { slug: role.slug } })
    if (!dbRole) continue

    for (const permSlug of role.permissions) {
      const dbPerm = await db.permission.findUnique({ where: { slug: permSlug } })
      if (!dbPerm) continue

      // Use upsert on the unique constraint
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: dbRole.id,
            permissionId: dbPerm.id,
          },
        },
        update: {},
        create: {
          roleId: dbRole.id,
          permissionId: dbPerm.id,
        },
      })
    }

    // Remove permissions that are no longer in the role definition
    const currentAssignments = await db.rolePermission.findMany({
      where: { roleId: dbRole.id },
      include: { permission: true },
    })
    const expectedSlugs = new Set(role.permissions)
    for (const assignment of currentAssignments) {
      if (!expectedSlugs.has(assignment.permission.slug as PermissionSlug)) {
        await db.rolePermission.delete({ where: { id: assignment.id } })
      }
    }
  }

  return {
    permissionsCount: Object.keys(PERMISSIONS).length,
    rolesCount: ROLES.length,
    roles: ROLES.map(r => ({
      slug: r.slug,
      name: r.name,
      level: r.level,
      permissionsCount: r.permissions.length,
    })),
  }
}
