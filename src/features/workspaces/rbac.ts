/**
 * RBAC Permission Matrix for Workspaces
 *
 * Defines permission keys, role levels, and helper functions for
 * workspace-level access control.
 */

// ─── Permission Definitions ──────────────────────────────────────────────

export const WORKSPACE_PERMISSIONS: Record<string, string> = {
  // Workspace management
  'workspace:update': 'Update workspace settings',
  'workspace:delete': 'Delete the workspace',

  // Member management
  'member:invite': 'Invite new members to the workspace',
  'member:remove': 'Remove members from the workspace',
  'member:update_role': 'Change member roles and permissions',

  // Contacts
  'contact:create': 'Create new contacts',
  'contact:read': 'View contacts',
  'contact:update': 'Edit existing contacts',
  'contact:delete': 'Delete contacts',

  // Deals
  'deal:create': 'Create new deals',
  'deal:read': 'View deals',
  'deal:update': 'Edit existing deals',
  'deal:delete': 'Delete deals',

  // Campaigns
  'campaign:create': 'Create new campaigns',
  'campaign:read': 'View campaigns',
  'campaign:update': 'Edit existing campaigns',
  'campaign:delete': 'Delete campaigns',
  'campaign:send': 'Send or schedule campaigns',

  // Workflows
  'workflow:create': 'Create new workflows',
  'workflow:read': 'View workflows',
  'workflow:update': 'Edit existing workflows',
  'workflow:delete': 'Delete workflows',

  // Analytics
  'analytics:read': 'View analytics and reports',

  // Templates
  'template:create': 'Create new templates',
  'template:read': 'View templates',
  'template:update': 'Edit existing templates',
  'template:delete': 'Delete templates',
}

// Array of all permission keys for validation
export const ALL_PERMISSIONS = Object.keys(WORKSPACE_PERMISSIONS)

// ─── Permission Groups (for UI display) ──────────────────────────────────

export const PERMISSION_GROUPS: Record<string, { label: string; permissions: string[] }> = {
  workspace: {
    label: 'Workspace',
    permissions: ['workspace:update', 'workspace:delete'],
  },
  members: {
    label: 'Members',
    permissions: ['member:invite', 'member:remove', 'member:update_role'],
  },
  contacts: {
    label: 'Contacts',
    permissions: ['contact:create', 'contact:read', 'contact:update', 'contact:delete'],
  },
  deals: {
    label: 'Deals',
    permissions: ['deal:create', 'deal:read', 'deal:update', 'deal:delete'],
  },
  campaigns: {
    label: 'Campaigns',
    permissions: ['campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete', 'campaign:send'],
  },
  workflows: {
    label: 'Workflows',
    permissions: ['workflow:create', 'workflow:read', 'workflow:update', 'workflow:delete'],
  },
  analytics: {
    label: 'Analytics',
    permissions: ['analytics:read'],
  },
  templates: {
    label: 'Templates',
    permissions: ['template:create', 'template:read', 'template:update', 'template:delete'],
  },
}

// ─── Role Definitions ────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'agent' | 'viewer'

export const VALID_ROLES: WorkspaceRole[] = ['owner', 'admin', 'agent', 'viewer']

export const WORKSPACE_ROLES: Record<WorkspaceRole, { level: number; label: string; description: string; permissions: string[] }> = {
  owner: {
    level: 100,
    label: 'Owner',
    description: 'Full access to all workspace features and settings',
    permissions: ALL_PERMISSIONS,
  },
  admin: {
    level: 75,
    label: 'Admin',
    description: 'Can manage members and all content, but cannot delete the workspace',
    permissions: ALL_PERMISSIONS.filter(p => p !== 'workspace:delete'),
  },
  agent: {
    level: 50,
    label: 'Agent',
    description: 'Can create and edit contacts, deals, campaigns, and workflows',
    permissions: [
      'workspace:update',
      'member:invite',
      'contact:create',
      'contact:read',
      'contact:update',
      'contact:delete',
      'deal:create',
      'deal:read',
      'deal:update',
      'deal:delete',
      'campaign:create',
      'campaign:read',
      'campaign:update',
      'campaign:send',
      'workflow:create',
      'workflow:read',
      'workflow:update',
      'analytics:read',
      'template:create',
      'template:read',
      'template:update',
    ],
  },
  viewer: {
    level: 25,
    label: 'Viewer',
    description: 'Read-only access to contacts, deals, campaigns, and analytics',
    permissions: [
      'contact:read',
      'deal:read',
      'campaign:read',
      'workflow:read',
      'analytics:read',
      'template:read',
    ],
  },
}

// Alias for backward compatibility with API routes that use ROLE_PERMISSIONS
export const ROLE_PERMISSIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(WORKSPACE_ROLES).map(([role, def]) => [role, def.permissions])
) as Record<string, string[]>

// ─── Permission Check Functions ──────────────────────────────────────────

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: WorkspaceRole | string, permission: string): boolean {
  const roleDef = WORKSPACE_ROLES[role as WorkspaceRole]
  if (!roleDef) return false
  return roleDef.permissions.includes(permission)
}

/**
 * Get all permissions for a given role
 */
export function getWorkspacePermissions(role: WorkspaceRole | string): string[] {
  const roleDef = WORKSPACE_ROLES[role as WorkspaceRole]
  if (!roleDef) return []
  return [...roleDef.permissions]
}

/**
 * Check if a role can modify workspace settings (owner only)
 */
export function canModifyWorkspace(role: WorkspaceRole | string): boolean {
  return role === 'owner'
}

/**
 * Check if a role can manage members (owner or admin)
 */
export function canManageMembers(role: WorkspaceRole | string): boolean {
  return role === 'owner' || role === 'admin'
}

// ─── Permission Serialization Helpers ────────────────────────────────────

/**
 * Serialize permissions array to a JSON string for database storage
 */
export function serializePermissions(permissions: string[]): string {
  return JSON.stringify(permissions)
}

/**
 * Parse permissions from a JSON string stored in the database
 */
export function parsePermissions(permissionsJson: string | null | undefined): string[] {
  if (!permissionsJson) return []
  try {
    const parsed = JSON.parse(permissionsJson)
    if (Array.isArray(parsed)) {
      return parsed.filter((p: unknown) => typeof p === 'string')
    }
    return []
  } catch {
    return []
  }
}

// ─── Slug Generation Helper ──────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a workspace name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}
