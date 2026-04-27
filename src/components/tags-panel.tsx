'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag, Plus, Pencil, Trash2, Search, FolderOpen,
  Hash, Star, Flag, Briefcase, FileText, Mail,
  CheckSquare, LayoutGrid, RotateCcw, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Constants ───────────────────────────────────────────────────────

const presetColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
]

const categoryLabels: Record<string, string> = {
  urgent: 'Urgent',
  client: 'Client',
  status: 'Statut',
  billing: 'Facturation',
  general: 'Général',
  custom: 'Personnalisé',
}

const categoryFilters = [
  { key: 'all', label: 'Toutes' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'client', label: 'Client' },
  { key: 'status', label: 'Statut' },
  { key: 'billing', label: 'Facturation' },
  { key: 'general', label: 'Général' },
  { key: 'custom', label: 'Custom' },
]

const iconOptions = [
  { value: '', label: 'Aucun', icon: Hash },
  { value: 'star', label: 'Étoile', icon: Star },
  { value: 'flag', label: 'Drapeau', icon: Flag },
  { value: 'briefcase', label: 'Mallette', icon: Briefcase },
  { value: 'file', label: 'Fichier', icon: FileText },
  { value: 'mail', label: 'Email', icon: Mail },
  { value: 'check', label: 'Tâche', icon: CheckSquare },
  { value: 'grid', label: 'Projet', icon: LayoutGrid },
]

const iconMap: Record<string, React.ElementType> = {
  star: Star,
  flag: Flag,
  briefcase: Briefcase,
  file: FileText,
  mail: Mail,
  check: CheckSquare,
  grid: LayoutGrid,
}

// ─── Types ───────────────────────────────────────────────────────────

interface TagItem {
  id: string
  name: string
  color: string
  icon: string | null
  category: string
  usageCount: number
}

interface TagFormData {
  name: string
  color: string
  icon: string
  category: string
}

// ─── Component ───────────────────────────────────────────────────────

export function TagsSection() {
  const { tasks, projects, emails, documents } = useAppStore()

  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: presetColors[0],
    icon: '',
    category: 'general',
  })

  // Bulk assign state
  const [bulkTagId, setBulkTagId] = useState('')
  const [bulkSelectedEntities, setBulkSelectedEntities] = useState<string[]>([])
  const [bulkEntityType, setBulkEntityType] = useState<string>('tasks')

  // ─── Fetch tags on mount ────────────────────────────────────────────

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tags')
      if (!res.ok) throw new Error('Failed to fetch tags')
      const data = await res.json()
      const mapped: TagItem[] = data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        color: t.color as string,
        icon: (t.icon as string) || '',
        category: t.category as string,
        usageCount: (t._count as Record<string, number>)
          ? ((t._count as Record<string, number>).taskTags || 0) +
            ((t._count as Record<string, number>).emailTags || 0) +
            ((t._count as Record<string, number>).documentTags || 0) +
            ((t._count as Record<string, number>).projectTags || 0)
          : 0,
      }))
      setTags(mapped)
    } catch (error) {
      console.error('Failed to fetch tags:', error)
      toast.error('Erreur lors du chargement des tags')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Filtered tags
  const filteredTags = useMemo(() => {
    return tags.filter(tag => {
      const matchesCategory = activeCategory === 'all' || tag.category === activeCategory
      const matchesSearch = !searchQuery || tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [tags, activeCategory, searchQuery])

  // Entities for bulk assign
  const entityList = useMemo(() => {
    switch (bulkEntityType) {
      case 'tasks':
        return tasks.map(t => ({ id: t.id, label: t.title }))
      case 'emails':
        return emails.map(e => ({ id: e.id, label: e.subject }))
      case 'documents':
        return documents.map(d => ({ id: d.id, label: d.name }))
      case 'projects':
        return projects.map(p => ({ id: p.id, label: p.name }))
      default:
        return []
    }
  }, [bulkEntityType, tasks, emails, documents, projects])

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom du tag est requis')
      return
    }
    try {
      setCreating(true)
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon || null,
          category: formData.category,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
      const newTag = await res.json()
      const usageCount = newTag._count
        ? (newTag._count.taskTags || 0) + (newTag._count.emailTags || 0) +
          (newTag._count.documentTags || 0) + (newTag._count.projectTags || 0)
        : 0
      setTags(prev => [...prev, {
        id: newTag.id,
        name: newTag.name,
        color: newTag.color,
        icon: newTag.icon || '',
        category: newTag.category,
        usageCount,
      }])
      setCreateDialogOpen(false)
      resetForm()
      toast.success(`Tag "${newTag.name}" créé avec succès`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la création'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editingTag || !formData.name.trim()) {
      toast.error('Le nom du tag est requis')
      return
    }
    try {
      setEditing(true)
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon || null,
          category: formData.category,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
      const updatedTag = await res.json()
      const usageCount = updatedTag._count
        ? (updatedTag._count.taskTags || 0) + (updatedTag._count.emailTags || 0) +
          (updatedTag._count.documentTags || 0) + (updatedTag._count.projectTags || 0)
        : 0
      setTags(prev => prev.map(t =>
        t.id === editingTag.id
          ? {
              ...t,
              name: updatedTag.name,
              color: updatedTag.color,
              icon: updatedTag.icon || '',
              category: updatedTag.category,
              usageCount,
            }
          : t
      ))
      setEditDialogOpen(false)
      setEditingTag(null)
      resetForm()
      toast.success('Tag mis à jour avec succès')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
      toast.error(message)
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async (tag: TagItem) => {
    try {
      setDeleting(true)
      const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
      setTags(prev => prev.filter(t => t.id !== tag.id))
      toast.success(`Tag "${tag.name}" supprimé`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      toast.error(message)
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
      setTagToDelete(null)
    }
  }

  const confirmDelete = (tag: TagItem) => {
    setTagToDelete(tag)
    setDeleteConfirmOpen(true)
  }

  const handleLoadDefaults = async () => {
    try {
      setSeeding(true)
      const res = await fetch('/api/tags/seed', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
      const data = await res.json()
      toast.success(`${data.created} tag(s) par défaut ajouté(s)${data.skipped > 0 ? ` (${data.skipped} déjà existant(s))` : ''}`)
      await fetchTags()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement des tags par défaut'
      toast.error(message)
    } finally {
      setSeeding(false)
    }
  }

  const handleBulkAssign = async () => {
    if (!bulkTagId) {
      toast.error('Veuillez sélectionner un tag')
      return
    }
    if (bulkSelectedEntities.length === 0) {
      toast.error('Veuillez sélectionner au moins une entité')
      return
    }
    const tag = tags.find(t => t.id === bulkTagId)
    // Map plural entity type to singular for API
    const entityTypeMap: Record<string, string> = {
      tasks: 'task',
      emails: 'email',
      documents: 'document',
      projects: 'project',
    }
    try {
      setBulkAssigning(true)
      const res = await fetch('/api/tags/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagId: bulkTagId,
          entityType: entityTypeMap[bulkEntityType] || bulkEntityType,
          entityIds: bulkSelectedEntities,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
      const data = await res.json()
      setTags(prev => prev.map(t =>
        t.id === bulkTagId ? { ...t, usageCount: t.usageCount + (data.assigned || bulkSelectedEntities.length) } : t
      ))
      setBulkDialogOpen(false)
      setBulkTagId('')
      setBulkSelectedEntities([])
      toast.success(`Tag "${tag?.name}" assigné à ${data.assigned || bulkSelectedEntities.length} élément(s)`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de l'assignation"
      toast.error(message)
    } finally {
      setBulkAssigning(false)
    }
  }

  const openEditDialog = (tag: TagItem) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color, icon: tag.icon ?? '', category: tag.category })
    setEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ name: '', color: presetColors[0], icon: '', category: 'general' })
  }

  const toggleBulkEntity = (id: string) => {
    setBulkSelectedEntities(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Tag className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tags & Labels</h2>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Chargement...' : `${tags.length} tags`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadDefaults}
            disabled={seeding}
            className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            {seeding ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
            )}
            Tags par défaut
          </Button>
          <Button
            size="sm"
            onClick={() => { resetForm(); setCreateDialogOpen(true) }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {categoryFilters.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeCategory === cat.key
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-secondary text-muted-foreground hover:bg-muted border border-transparent'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag List */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card animate-pulse">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="flex-1" />
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-4 w-12 bg-muted rounded" />
            </div>
          ))
        ) : (
          <AnimatePresence>
            {filteredTags.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <CardContent className="py-8 text-center">
                    <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun tag trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Créez un nouveau tag ou chargez les tags par défaut
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredTags.map((tag, index) => {
                const TagIcon = tag.icon ? iconMap[tag.icon] : null
                return (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                      {/* Color dot */}
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background"
                        style={{ backgroundColor: tag.color, boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${tag.color}` }}
                      />

                      {/* Icon */}
                      {TagIcon && (
                        <TagIcon className="w-4 h-4 flex-shrink-0" style={{ color: tag.color }} />
                      )}

                      {/* Name */}
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">
                        {tag.name}
                      </span>

                      {/* Category badge */}
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 flex-shrink-0"
                      >
                        {categoryLabels[tag.category] || tag.category}
                      </Badge>

                      {/* Usage count */}
                      <span className="text-xs text-muted-foreground flex-shrink-0 min-w-[40px] text-right">
                        {tag.usageCount} utilisation{tag.usageCount !== 1 ? 's' : ''}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-emerald-400"
                          onClick={() => openEditDialog(tag)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          onClick={() => confirmDelete(tag)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bulk Assign */}
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Assignation en masse</p>
          <p className="text-xs text-muted-foreground">Assigner un tag à plusieurs éléments</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setBulkTagId(''); setBulkSelectedEntities([]); setBulkEntityType('tasks'); setBulkDialogOpen(true) }}
          className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <FolderOpen className="w-3.5 h-3.5 mr-1" />
          Assigner
        </Button>
      </div>

      {/* ─── Create/Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false)
          setEditDialogOpen(false)
          setEditingTag(null)
          resetForm()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              {editDialogOpen ? 'Modifier le tag' : 'Nouveau tag'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom du tag..."
                className="bg-secondary"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {presetColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-all border-2',
                      formData.color === color
                        ? 'border-foreground scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Icon Select */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Icône</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Sélectionner une icône" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(opt => {
                    const OptIcon = opt.icon
                    return (
                      <SelectItem key={opt.value} value={opt.value || 'none'}>
                        <div className="flex items-center gap-2">
                          <OptIcon className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Category Select */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Aperçu :</p>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: formData.color }}
                />
                {formData.icon && iconMap[formData.icon] && (() => {
                  const PreviewIcon = iconMap[formData.icon]
                  return <PreviewIcon className="w-4 h-4" style={{ color: formData.color }} />
                })()}
                <span className="text-sm font-medium">
                  {formData.name || 'Nom du tag'}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {categoryLabels[formData.category]}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setEditDialogOpen(false)
                setEditingTag(null)
                resetForm()
              }}
              disabled={creating || editing}
            >
              Annuler
            </Button>
            <Button
              onClick={editDialogOpen ? handleEdit : handleCreate}
              disabled={creating || editing}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {(creating || editing) && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              {editDialogOpen ? 'Sauvegarder' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Supprimer le tag
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le tag &quot;{tagToDelete?.name}&quot; ? Cette action est irréversible et supprimera toutes les associations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteConfirmOpen(false); setTagToDelete(null) }}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => tagToDelete && handleDelete(tagToDelete)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Assign Dialog ──────────────────────────────────────── */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              Assignation en masse
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tag selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tag à assigner</Label>
              <Select value={bulkTagId} onValueChange={setBulkTagId}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Sélectionner un tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity type selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Type d&apos;élément</Label>
              <Select value={bulkEntityType} onValueChange={(v) => { setBulkEntityType(v); setBulkSelectedEntities([]) }}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tasks">Tâches</SelectItem>
                  <SelectItem value="emails">Emails</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="projects">Projets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity list */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Sélectionner les éléments ({bulkSelectedEntities.length} sélectionné{bulkSelectedEntities.length !== 1 ? 's' : ''})
              </Label>
              <div className="max-h-48 overflow-y-auto rounded-lg border bg-secondary/30 custom-scrollbar">
                {entityList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Aucun élément disponible
                  </div>
                ) : (
                  entityList.map(entity => (
                    <div
                      key={entity.id}
                      onClick={() => toggleBulkEntity(entity.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-b-0',
                        bulkSelectedEntities.includes(entity.id) && 'bg-emerald-500/10'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                        bulkSelectedEntities.includes(entity.id)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-muted-foreground/30'
                      )}>
                        {bulkSelectedEntities.includes(entity.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm truncate">{entity.label}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkAssigning}>
              Annuler
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssigning}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {bulkAssigning && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
