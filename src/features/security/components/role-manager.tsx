'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Plus,
  Trash2,
  Users,
  Key,
  Edit,
  Check,
  X,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { PERMISSIONS, type PermissionSlug } from '@/features/security/rbac/permissions'
import { PermissionMatrix } from './permission-matrix'

// ─── Types ─────────────────────────────────────────────────────────────────

interface RolePermission {
  id: string
  slug: string
  resource: string
  action: string
  description?: string
}

interface Role {
  id: string
  slug: string
  name: string
  description: string | null
  level: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
  permissions: RolePermission[]
  membersCount: number
}

interface RolesResponse {
  roles: Role[]
}

// ─── Role Color Helpers ────────────────────────────────────────────────────

function roleColor(level: number) {
  if (level >= 80) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' }
  if (level >= 60) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' }
  if (level >= 40) return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' }
  if (level >= 20) return { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' }
  return { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-border' }
}

function levelLabel(level: number) {
  if (level >= 100) return 'Super Admin'
  if (level >= 80) return 'Propriétaire'
  if (level >= 60) return 'Admin'
  if (level >= 40) return 'Membre'
  if (level >= 20) return 'Observateur'
  return 'Invité'
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function RolesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // New role dialog
  const [newRoleOpen, setNewRoleOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleSlug, setNewRoleSlug] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [newRoleLevel, setNewRoleLevel] = useState(30)
  const [creating, setCreating] = useState(false)

  // Assign role dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignTeamId, setAssignTeamId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Edit pending changes
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set())
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // ─── Fetch Roles ──────────────────────────────────────────────────────

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Erreur')
      const data: RolesResponse = await res.json()
      setRoles(data.roles)
      // Auto-select first role if none selected
      if (!selectedRoleId && data.roles.length > 0) {
        setSelectedRoleId(data.roles[0].id)
      }
    } catch {
      toast.error('Erreur lors du chargement des rôles')
    } finally {
      setLoading(false)
    }
  }, [selectedRoleId])

  useEffect(() => {
    fetchRoles()
  }, [])

  // ─── Selected Role ────────────────────────────────────────────────────

  const selectedRole = useMemo(() => {
    return roles.find(r => r.id === selectedRoleId) || null
  }, [roles, selectedRoleId])

  const grantedSlugs = useMemo(() => {
    if (!selectedRole) return new Set<string>()
    return new Set(selectedRole.permissions.map(p => p.slug))
  }, [selectedRole])

  // ─── Filtered Roles ──────────────────────────────────────────────────

  const filteredRoles = useMemo(() => {
    if (!searchQuery) return roles
    const q = searchQuery.toLowerCase()
    return roles.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    )
  }, [roles, searchQuery])

  // ─── Create Role ──────────────────────────────────────────────────────

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Le nom du rôle est requis')
      return
    }
    if (!newRoleSlug.trim()) {
      toast.error('Le slug du rôle est requis')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newRoleSlug,
          name: newRoleName,
          description: newRoleDescription || undefined,
          level: newRoleLevel,
          permissionSlugs: [],
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }

      toast.success(`Rôle "${newRoleName}" créé avec succès`)
      setNewRoleOpen(false)
      setNewRoleName('')
      setNewRoleSlug('')
      setNewRoleDescription('')
      setNewRoleLevel(30)
      fetchRoles()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  // ─── Delete Role ──────────────────────────────────────────────────────

  const handleDeleteRole = async (roleId: string) => {
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }
      toast.success('Rôle supprimé')
      if (selectedRoleId === roleId) {
        setSelectedRoleId(roles[0]?.id || null)
      }
      fetchRoles()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression')
    }
  }

  // ─── Toggle Permission ────────────────────────────────────────────────

  const handleTogglePermission = (slug: string, granted: boolean) => {
    if (granted) {
      // Adding permission
      setPendingRemove(prev => {
        const next = new Set(prev)
        next.delete(slug)
        return next
      })
      if (!grantedSlugs.has(slug)) {
        setPendingAdd(prev => new Set(prev).add(slug))
      }
    } else {
      // Removing permission
      setPendingAdd(prev => {
        const next = new Set(prev)
        next.delete(slug)
        return next
      })
      if (grantedSlugs.has(slug)) {
        setPendingRemove(prev => new Set(prev).add(slug))
      }
    }
  }

  // ─── Save Permission Changes ──────────────────────────────────────────

  const handleSavePermissions = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addPermissions: Array.from(pendingAdd),
          removePermissions: Array.from(pendingRemove),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }

      toast.success('Permissions mises à jour')
      setPendingAdd(new Set())
      setPendingRemove(new Set())
      setEditMode(false)
      fetchRoles()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ─── Cancel Edit ──────────────────────────────────────────────────────

  const handleCancelEdit = () => {
    setPendingAdd(new Set())
    setPendingRemove(new Set())
    setEditMode(false)
  }

  // ─── Assign Role ──────────────────────────────────────────────────────

  const handleAssignRole = async () => {
    if (!assignUserId || !assignTeamId || !selectedRoleId) {
      toast.error('Tous les champs sont requis')
      return
    }

    setAssigning(true)
    try {
      const res = await fetch('/api/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignUserId,
          roleId: selectedRoleId,
          teamId: assignTeamId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }

      toast.success('Rôle assigné avec succès')
      setAssignOpen(false)
      setAssignUserId('')
      setAssignTeamId('')
      fetchRoles()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'assignation')
    } finally {
      setAssigning(false)
    }
  }

  // ─── Seed Default Roles ───────────────────────────────────────────────

  const handleSeedRoles = async () => {
    try {
      const res = await fetch('/api/roles/seed', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }
      toast.success('Rôles par défaut initialisés')
      fetchRoles()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'initialisation')
    }
  }

  // ─── Auto-generate slug from name ────────────────────────────────────

  const handleNameChange = (name: string) => {
    setNewRoleName(name)
    setNewRoleSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  // ─── Has pending changes ─────────────────────────────────────────────

  const hasPendingChanges = pendingAdd.size > 0 || pendingRemove.size > 0

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Key className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Gestionnaire de rôles</h3>
            <p className="text-xs text-muted-foreground">
              {roles.length} rôle{roles.length !== 1 ? 's' : ''} défini{roles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedRoles}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Initialiser défauts
          </Button>
          <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nouveau rôle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un rôle personnalisé</DialogTitle>
                <DialogDescription>
                  Définissez un nouveau rôle avec ses permissions. Vous pourrez modifier les permissions ensuite.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nom du rôle</Label>
                    <Input
                      value={newRoleName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ex: Éditeur"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Slug</Label>
                    <Input
                      value={newRoleSlug}
                      onChange={(e) => setNewRoleSlug(e.target.value)}
                      placeholder="ex: editeur"
                      className="bg-secondary font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="Description optionnelle..."
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Niveau hiérarchique ({newRoleLevel}) — {levelLabel(newRoleLevel)}
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={newRoleLevel}
                      onChange={(e) => setNewRoleLevel(Number(e.target.value))}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-xs font-mono text-muted-foreground w-8">{newRoleLevel}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewRoleOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateRole}
                  disabled={creating}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Créer le rôle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column: Roles List ──────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un rôle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary h-9 text-xs"
            />
          </div>

          {/* Roles List */}
          <Card>
            <CardContent className="p-3">
              {loading ? (
                <RolesSkeleton />
              ) : filteredRoles.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Shield className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun rôle trouvé</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1">
                    {filteredRoles.map((role) => {
                      const colors = roleColor(role.level)
                      const isSelected = selectedRoleId === role.id

                      return (
                        <motion.div
                          key={role.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            setSelectedRoleId(role.id)
                            handleCancelEdit()
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/10 border border-emerald-500/20'
                              : 'hover:bg-secondary/80 border border-transparent'
                          }`}
                        >
                          {/* Level Indicator */}
                          <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                            <Shield className={`w-4 h-4 ${colors.text}`} />
                          </div>

                          {/* Role Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{role.name}</p>
                              {role.isDefault && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-secondary/50">
                                  Défaut
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                Niveau {role.level}
                              </span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Users className="w-3 h-3" />
                                {role.membersCount}
                              </span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground">
                                {role.permissions.length} perm.
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          {!role.isDefault && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer le rôle &quot;{role.name}&quot; ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. Le rôle sera définitivement supprimé.
                                    {role.membersCount > 0 && (
                                      <span className="text-red-400 block mt-2">
                                        ⚠️ Ce rôle est assigné à {role.membersCount} membre(s). Réassignez-les d&apos;abord.
                                      </span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                    disabled={role.membersCount > 0}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right Column: Permission Matrix ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRole ? (
            <>
              {/* Role Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${roleColor(selectedRole.level).bg} flex items-center justify-center flex-shrink-0`}>
                        <Shield className={`w-5 h-5 ${roleColor(selectedRole.level).text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">{selectedRole.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 ${roleColor(selectedRole.level).bg} ${roleColor(selectedRole.level).text} ${roleColor(selectedRole.level).border}`}
                          >
                            Niveau {selectedRole.level} — {levelLabel(selectedRole.level)}
                          </Badge>
                        </div>
                        {selectedRole.description && (
                          <p className="text-xs text-muted-foreground mt-1">{selectedRole.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {selectedRole.membersCount} membre{selectedRole.membersCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {selectedRole.permissions.length} permission{selectedRole.permissions.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {selectedRole.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editMode ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="text-xs"
                            disabled={saving}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSavePermissions}
                            disabled={saving || !hasPendingChanges}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                          >
                            {saving ? (
                              <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1" />
                            )}
                            Sauvegarder
                            {hasPendingChanges && (
                              <Badge className="ml-1.5 bg-white/20 text-white text-[9px] h-4 px-1">
                                +{pendingAdd.size} / -{pendingRemove.size}
                              </Badge>
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignOpen(true)}
                            className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <Users className="w-3.5 h-3.5 mr-1" />
                            Assigner
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditMode(true)}
                            className="text-xs"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            Modifier
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Permission Matrix */}
              <PermissionMatrix
                grantedSlugs={grantedSlugs}
                editable={editMode}
                onToggle={handleTogglePermission}
                pendingAdd={pendingAdd}
                pendingRemove={pendingRemove}
              />
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Sélectionnez un rôle pour voir ses permissions</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner le rôle &quot;{selectedRole?.name}&quot;</DialogTitle>
            <DialogDescription>
              Assignez ce rôle à un membre de l&apos;équipe. Le membre héritera de toutes les permissions du rôle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">ID Utilisateur</Label>
              <Input
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                placeholder="ID de l'utilisateur"
                className="bg-secondary font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">ID Équipe</Label>
              <Input
                value={assignTeamId}
                onChange={(e) => setAssignTeamId(e.target.value)}
                placeholder="ID de l'équipe"
                className="bg-secondary font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={assigning}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {assigning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
