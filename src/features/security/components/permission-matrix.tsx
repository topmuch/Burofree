'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { PERMISSIONS, type PermissionSlug } from '@/features/security/rbac/permissions'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PermissionEntry {
  id: string
  slug: string
  resource: string
  action: string
  description?: string
}

export interface PermissionMatrixProps {
  /** Permissions currently granted to the selected role */
  grantedSlugs: Set<string>
  /** Whether the matrix is in edit mode */
  editable?: boolean
  /** Callback when a permission is toggled (edit mode only) */
  onToggle?: (slug: string, granted: boolean) => void
  /** Which permissions are currently staged for adding */
  pendingAdd?: Set<string>
  /** Which permissions are currently staged for removing */
  pendingRemove?: Set<string>
}

// ─── Resource Labels ───────────────────────────────────────────────────────

const RESOURCE_LABELS: Record<string, string> = {
  task: 'Tâches',
  project: 'Projets',
  invoice: 'Factures',
  email: 'Emails',
  document: 'Documents',
  time: 'Temps',
  team: 'Équipe',
  billing: 'Facturation',
  settings: 'Paramètres',
  data: 'Données',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Créer',
  read: 'Lire',
  update: 'Modifier',
  delete: 'Supprimer',
  manage: 'Gérer',
  export: 'Exporter',
  send: 'Envoyer',
  invite: 'Inviter',
  remove: 'Retirer',
  security: 'Sécurité',
  import: 'Importer',
}

const RESOURCE_ICONS: Record<string, string> = {
  task: '✅',
  project: '📁',
  invoice: '🧾',
  email: '📧',
  document: '📄',
  time: '⏱️',
  team: '👥',
  billing: '💳',
  settings: '⚙️',
  data: '💾',
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PermissionMatrix({
  grantedSlugs,
  editable = false,
  onToggle,
  pendingAdd = new Set(),
  pendingRemove = new Set(),
}: PermissionMatrixProps) {
  // Group permissions by resource
  const resourceMap = useMemo(() => {
    const map = new Map<string, PermissionEntry[]>()

    // Use the centralized PERMISSIONS definition
    for (const [slug, perm] of Object.entries(PERMISSIONS)) {
      const resource = perm.resource
      if (!map.has(resource)) map.set(resource, [])
      map.get(resource)!.push({
        id: slug,
        slug,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      })
    }

    // Sort actions within each resource
    for (const perms of map.values()) {
      perms.sort((a, b) => a.action.localeCompare(b.action))
    }

    return map
  }, [])

  const resources = Array.from(resourceMap.keys())
  const allActions = useMemo(() => {
    const actions = new Set<string>()
    for (const perms of resourceMap.values()) {
      for (const p of perms) actions.add(p.action)
    }
    return Array.from(actions).sort()
  }, [resourceMap])

  // Check if a slug is granted (including pending changes)
  const isGranted = (slug: string): boolean => {
    if (pendingRemove.has(slug)) return false
    if (pendingAdd.has(slug)) return true
    return grantedSlugs.has(slug)
  }

  // Get the status of a cell for visual indication
  const getCellStatus = (slug: string): 'granted' | 'denied' | 'pending-add' | 'pending-remove' => {
    if (pendingAdd.has(slug)) return 'pending-add'
    if (pendingRemove.has(slug)) return 'pending-remove'
    if (grantedSlugs.has(slug)) return 'granted'
    return 'denied'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Matrice des permissions
          </CardTitle>
          {editable && (
            <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/30">
              Mode édition
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header Row */}
            <div className="grid border-b" style={{ gridTemplateColumns: `180px repeat(${allActions.length}, minmax(80px, 1fr))` }}>
              <div className="p-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium border-r">
                Ressource
              </div>
              {allActions.map(action => (
                <div key={action} className="p-2 text-center text-[10px] text-muted-foreground uppercase tracking-wider font-medium border-r last:border-r-0">
                  {ACTION_LABELS[action] || action}
                </div>
              ))}
            </div>

            {/* Resource Rows */}
            {resources.map((resource, rIdx) => {
              const perms = resourceMap.get(resource) || []
              const permsByAction = new Map(perms.map(p => [p.action, p]))

              return (
                <motion.div
                  key={resource}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rIdx * 0.03 }}
                  className={`grid border-b last:border-b-0 ${rIdx % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}`}
                  style={{ gridTemplateColumns: `180px repeat(${allActions.length}, minmax(80px, 1fr))` }}
                >
                  {/* Resource Label */}
                  <div className="p-2 flex items-center gap-2 border-r">
                    <span className="text-sm">{RESOURCE_ICONS[resource] || '📋'}</span>
                    <span className="text-xs font-medium">
                      {RESOURCE_LABELS[resource] || resource}
                    </span>
                  </div>

                  {/* Permission Cells */}
                  {allActions.map(action => {
                    const perm = permsByAction.get(action)
                    if (!perm) {
                      return (
                        <div key={action} className="p-2 flex items-center justify-center border-r last:border-r-0">
                          <span className="text-muted-foreground/20">—</span>
                        </div>
                      )
                    }

                    const granted = isGranted(perm.slug)
                    const status = getCellStatus(perm.slug)

                    return (
                      <div
                        key={action}
                        className={`p-2 flex items-center justify-center border-r last:border-r-0 transition-colors ${
                          editable ? 'cursor-pointer hover:bg-secondary/50' : ''
                        }`}
                        onClick={() => {
                          if (editable && onToggle) {
                            onToggle(perm.slug, !granted)
                          }
                        }}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center">
                                {editable ? (
                                  <Checkbox
                                    checked={granted}
                                    className={`${
                                      status === 'pending-add'
                                        ? 'border-emerald-400 data-[state=checked]:bg-emerald-500'
                                        : status === 'pending-remove'
                                          ? 'border-red-400'
                                          : ''
                                    }`}
                                  />
                                ) : granted ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  >
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    </div>
                                  </motion.div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-secondary/50 flex items-center justify-center">
                                    <X className="w-3 h-3 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">{perm.description || `${RESOURCE_LABELS[resource] || resource}: ${ACTION_LABELS[action] || action}`}</p>
                              <p className="text-muted-foreground text-[10px]">{perm.slug}</p>
                              {status === 'pending-add' && <p className="text-emerald-400 text-[10px]">À ajouter</p>}
                              {status === 'pending-remove' && <p className="text-red-400 text-[10px]">À retirer</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )
                  })}
                </motion.div>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 p-3 border-t bg-secondary/10">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Légende :</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            </div>
            <span className="text-[10px] text-muted-foreground">Accordé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-secondary/50 flex items-center justify-center">
              <X className="w-2.5 h-2.5 text-muted-foreground/40" />
            </div>
            <span className="text-[10px] text-muted-foreground">Non accordé</span>
          </div>
          {editable && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded border border-emerald-400 bg-emerald-500/30" />
                <span className="text-[10px] text-emerald-400">À ajouter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded border border-red-400" />
                <span className="text-[10px] text-red-400">À retirer</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
