/**
 * RBAC Permission Definitions — Burofree
 *
 * Central registry of all granular permissions.
 * Each permission has a resource, action, and description.
 */

export const PERMISSIONS = {
  // ─── Tasks ────────────────────────────────────────────────────────────
  'task:create': { resource: 'task', action: 'create', description: 'Créer des tâches' },
  'task:read': { resource: 'task', action: 'read', description: 'Voir les tâches' },
  'task:update': { resource: 'task', action: 'update', description: 'Modifier les tâches' },
  'task:delete': { resource: 'task', action: 'delete', description: 'Supprimer les tâches' },
  'task:manage': { resource: 'task', action: 'manage', description: 'Gérer toutes les tâches' },

  // ─── Projects ─────────────────────────────────────────────────────────
  'project:create': { resource: 'project', action: 'create', description: 'Créer des projets' },
  'project:read': { resource: 'project', action: 'read', description: 'Voir les projets' },
  'project:update': { resource: 'project', action: 'update', description: 'Modifier les projets' },
  'project:delete': { resource: 'project', action: 'delete', description: 'Supprimer les projets' },
  'project:manage': { resource: 'project', action: 'manage', description: 'Gérer tous les projets' },

  // ─── Invoices ─────────────────────────────────────────────────────────
  'invoice:create': { resource: 'invoice', action: 'create', description: 'Créer des factures' },
  'invoice:read': { resource: 'invoice', action: 'read', description: 'Voir les factures' },
  'invoice:update': { resource: 'invoice', action: 'update', description: 'Modifier les factures' },
  'invoice:delete': { resource: 'invoice', action: 'delete', description: 'Supprimer des factures' },
  'invoice:export': { resource: 'invoice', action: 'export', description: 'Exporter des factures' },

  // ─── Emails ───────────────────────────────────────────────────────────
  'email:read': { resource: 'email', action: 'read', description: 'Voir les emails' },
  'email:send': { resource: 'email', action: 'send', description: 'Envoyer des emails' },
  'email:delete': { resource: 'email', action: 'delete', description: 'Supprimer des emails' },

  // ─── Documents ────────────────────────────────────────────────────────
  'document:create': { resource: 'document', action: 'create', description: 'Créer des documents' },
  'document:read': { resource: 'document', action: 'read', description: 'Voir les documents' },
  'document:update': { resource: 'document', action: 'update', description: 'Modifier les documents' },
  'document:delete': { resource: 'document', action: 'delete', description: 'Supprimer des documents' },

  // ─── Time tracking ────────────────────────────────────────────────────
  'time:create': { resource: 'time', action: 'create', description: 'Créer des entrées de temps' },
  'time:read': { resource: 'time', action: 'read', description: 'Voir le suivi de temps' },
  'time:update': { resource: 'time', action: 'update', description: 'Modifier les entrées de temps' },
  'time:delete': { resource: 'time', action: 'delete', description: 'Supprimer des entrées de temps' },

  // ─── Team management ──────────────────────────────────────────────────
  'team:manage': { resource: 'team', action: 'manage', description: "Gérer l'équipe" },
  'team:invite': { resource: 'team', action: 'invite', description: 'Inviter des membres' },
  'team:remove': { resource: 'team', action: 'remove', description: 'Retirer des membres' },

  // ─── Billing ──────────────────────────────────────────────────────────
  'billing:read': { resource: 'billing', action: 'read', description: 'Voir la facturation' },
  'billing:manage': { resource: 'billing', action: 'manage', description: 'Gérer la facturation' },

  // ─── Settings ─────────────────────────────────────────────────────────
  'settings:read': { resource: 'settings', action: 'read', description: 'Voir les paramètres' },
  'settings:update': { resource: 'settings', action: 'update', description: 'Modifier les paramètres' },
  'settings:security': { resource: 'settings', action: 'security', description: 'Paramètres de sécurité' },

  // ─── Data ─────────────────────────────────────────────────────────────
  'data:export': { resource: 'data', action: 'export', description: 'Exporter les données' },
  'data:import': { resource: 'data', action: 'import', description: 'Importer des données' },
  'data:delete': { resource: 'data', action: 'delete', description: 'Supprimer des données' },
} as const

export type PermissionSlug = keyof typeof PERMISSIONS
