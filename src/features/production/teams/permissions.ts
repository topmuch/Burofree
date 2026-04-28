/**
 * Permission Matrix — Role-based access control for teams
 *
 * Defines what each role can do within a team context.
 * Roles: owner, admin, member, viewer
 */

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Permission {
  /** The permission identifier */
  key: string
  /** Human-readable description */
  label: string
  /** Which roles have this permission */
  roles: TeamRole[]
}

/**
 * Complete permission matrix for Maellis teams.
 * Each permission defines which roles have access.
 */
export const PERMISSIONS: Permission[] = [
  // Team management
  { key: 'team.update', label: 'Modifier les paramètres de l\'équipe', roles: ['owner', 'admin'] },
  { key: 'team.delete', label: 'Supprimer l\'équipe', roles: ['owner'] },
  { key: 'team.members.invite', label: 'Inviter des membres', roles: ['owner', 'admin'] },
  { key: 'team.members.remove', label: 'Retirer des membres', roles: ['owner', 'admin'] },
  { key: 'team.members.update_role', label: 'Modifier les rôles', roles: ['owner'] },
  { key: 'team.billing.manage', label: 'Gérer la facturation', roles: ['owner', 'admin'] },

  // Project permissions
  { key: 'project.create', label: 'Créer des projets', roles: ['owner', 'admin', 'member'] },
  { key: 'project.read', label: 'Voir les projets', roles: ['owner', 'admin', 'member', 'viewer'] },
  { key: 'project.update', label: 'Modifier les projets', roles: ['owner', 'admin', 'member'] },
  { key: 'project.delete', label: 'Supprimer les projets', roles: ['owner', 'admin'] },

  // Task permissions
  { key: 'task.create', label: 'Créer des tâches', roles: ['owner', 'admin', 'member'] },
  { key: 'task.read', label: 'Voir les tâches', roles: ['owner', 'admin', 'member', 'viewer'] },
  { key: 'task.update.own', label: 'Modifier ses propres tâches', roles: ['owner', 'admin', 'member'] },
  { key: 'task.update.any', label: 'Modifier toutes les tâches', roles: ['owner', 'admin'] },
  { key: 'task.delete', label: 'Supprimer des tâches', roles: ['owner', 'admin'] },

  // Invoice permissions
  { key: 'invoice.create', label: 'Créer des factures', roles: ['owner', 'admin', 'member'] },
  { key: 'invoice.read', label: 'Voir les factures', roles: ['owner', 'admin', 'member', 'viewer'] },
  { key: 'invoice.update', label: 'Modifier les factures', roles: ['owner', 'admin'] },
  { key: 'invoice.delete', label: 'Supprimer les factures', roles: ['owner'] },

  // Time tracking
  { key: 'time_entry.create', label: 'Créer des entrées de temps', roles: ['owner', 'admin', 'member'] },
  { key: 'time_entry.read', label: 'Voir les entrées de temps', roles: ['owner', 'admin', 'member', 'viewer'] },
  { key: 'time_entry.update.own', label: 'Modifier ses propres entrées', roles: ['owner', 'admin', 'member'] },
  { key: 'time_entry.update.any', label: 'Modifier toutes les entrées', roles: ['owner', 'admin'] },

  // Document permissions
  { key: 'document.create', label: 'Créer des documents', roles: ['owner', 'admin', 'member'] },
  { key: 'document.read', label: 'Voir les documents', roles: ['owner', 'admin', 'member', 'viewer'] },
  { key: 'document.update', label: 'Modifier les documents', roles: ['owner', 'admin', 'member'] },
  { key: 'document.delete', label: 'Supprimer des documents', roles: ['owner', 'admin'] },

  // Export/Import
  { key: 'export.create', label: 'Exporter des données', roles: ['owner', 'admin', 'member'] },
  { key: 'import.create', label: 'Importer des données', roles: ['owner', 'admin'] },

  // Audit logs
  { key: 'audit.read', label: 'Voir les logs d\'audit', roles: ['owner', 'admin'] },
]

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: TeamRole, permissionKey: string): boolean {
  const permission = PERMISSIONS.find(p => p.key === permissionKey)
  if (!permission) return false
  return permission.roles.includes(role)
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: TeamRole): string[] {
  return PERMISSIONS.filter(p => p.roles.includes(role)).map(p => p.key)
}

/**
 * Get the role hierarchy for display purposes.
 */
export function getRoleInfo(): Record<TeamRole, { label: string; description: string; color: string }> {
  return {
    owner: {
      label: 'Propriétaire',
      description: 'Contrôle total sur l\'équipe et la facturation',
      color: '#f59e0b',
    },
    admin: {
      label: 'Administrateur',
      description: 'Gère l\'équipe et les projets, pas la facturation critique',
      color: '#3b82f6',
    },
    member: {
      label: 'Membre',
      description: 'Crée et modifie ses propres ressources',
      color: '#10b981',
    },
    viewer: {
      label: 'Observateur',
      description: 'Lecture seule sur tous les projets',
      color: '#6b7280',
    },
  }
}
