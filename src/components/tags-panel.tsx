'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag, Plus, Pencil, Trash2, Search, FolderOpen,
  Hash, Star, Flag, Briefcase, FileText, Mail,
  CheckSquare, LayoutGrid, RotateCcw
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
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
  icon: string
  category: string
  usageCount: number
}

interface TagFormData {
  name: string
  color: string
  icon: string
  category: string
}

// ─── Default tags ────────────────────────────────────────────────────

const defaultTags: TagItem[] = [
  { id: 'default-1', name: 'Urgent', color: '#ef4444', icon: 'flag', category: 'urgent', usageCount: 0 },
  { id: 'default-2', name: 'Important', color: '#f97316', icon: 'star', category: 'urgent', usageCount: 0 },
  { id: 'default-3', name: 'Client VIP', color: '#8b5cf6', icon: 'briefcase', category: 'client', usageCount: 0 },
  { id: 'default-4', name: 'En cours', color: '#3b82f6', icon: '', category: 'status', usageCount: 0 },
  { id: 'default-5', name: 'Terminé', color: '#10b981', icon: 'check', category: 'status', usageCount: 0 },
  { id: 'default-6', name: 'En attente', color: '#f59e0b', icon: '', category: 'status', usageCount: 0 },
  { id: 'default-7', name: 'Facturé', color: '#06b6d4', icon: '', category: 'billing', usageCount: 0 },
  { id: 'default-8', name: 'Non facturé', color: '#ec4899', icon: '', category: 'billing', usageCount: 0 },
  { id: 'default-9', name: 'Interne', color: '#6b7280', icon: '', category: 'general', usageCount: 0 },
  { id: 'default-10', name: 'Révision', color: '#84cc16', icon: '', category: 'general', usageCount: 0 },
]

// ─── Component ───────────────────────────────────────────────────────

export function TagsSection() {
  const { tasks, projects, emails, documents } = useAppStore()

  const [tags, setTags] = useState<TagItem[]>([
    { id: 'tag-1', name: 'Urgent', color: '#ef4444', icon: 'flag', category: 'urgent', usageCount: 5 },
    { id: 'tag-2', name: 'Client VIP', color: '#8b5cf6', icon: 'briefcase', category: 'client', usageCount: 3 },
    { id: 'tag-3', name: 'En cours', color: '#3b82f6', icon: '', category: 'status', usageCount: 12 },
    { id: 'tag-4', name: 'Facturé', color: '#06b6d4', icon: '', category: 'billing', usageCount: 8 },
    { id: 'tag-5', name: 'Révision', color: '#84cc16', icon: '', category: 'general', usageCount: 2 },
    { id: 'tag-6', name: 'Non facturé', color: '#ec4899', icon: '', category: 'billing', usageCount: 4 },
    { id: 'tag-7', name: 'En attente', color: '#f59e0b', icon: '', category: 'status', usageCount: 6 },
    { id: 'tag-8', name: 'Interne', color: '#6b7280', icon: '', category: 'general', usageCount: 1 },
    { id: 'tag-9', name: 'Important', color: '#f97316', icon: 'star', category: 'urgent', usageCount: 7 },
    { id: 'tag-10', name: 'Personnalisé', color: '#8b5cf6', icon: 'grid', category: 'custom', usageCount: 0 },
  ])

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
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

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Le nom du tag est requis')
      return
    }
    const newTag: TagItem = {
      id: `tag-${Date.now()}`,
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon,
      category: formData.category,
      usageCount: 0,
    }
    setTags(prev => [...prev, newTag])
    setCreateDialogOpen(false)
    resetForm()
    toast.success(`Tag "${newTag.name}" créé`)
  }

  const handleEdit = () => {
    if (!editingTag || !formData.name.trim()) {
      toast.error('Le nom du tag est requis')
      return
    }
    setTags(prev => prev.map(t =>
      t.id === editingTag.id
        ? { ...t, name: formData.name.trim(), color: formData.color, icon: formData.icon, category: formData.category }
        : t
    ))
    setEditDialogOpen(false)
    setEditingTag(null)
    resetForm()
    toast.success('Tag mis à jour')
  }

  const handleDelete = (tag: TagItem) => {
    setTags(prev => prev.filter(t => t.id !== tag.id))
    toast.success(`Tag "${tag.name}" supprimé`)
  }

  const handleLoadDefaults = () => {
    const existingNames = new Set(tags.map(t => t.name))
    const newDefaults = defaultTags.filter(dt => !existingNames.has(dt.name)).map(dt => ({
      ...dt,
      id: `tag-${Date.now()}-${dt.id}`,
    }))
    if (newDefaults.length === 0) {
      toast.info('Tous les tags par défaut existent déjà')
      return
    }
    setTags(prev => [...prev, ...newDefaults])
    toast.success(`${newDefaults.length} tag(s) par défaut ajouté(s)`)
  }

  const handleBulkAssign = () => {
    if (!bulkTagId) {
      toast.error('Veuillez sélectionner un tag')
      return
    }
    if (bulkSelectedEntities.length === 0) {
      toast.error('Veuillez sélectionner au moins une entité')
      return
    }
    const tag = tags.find(t => t.id === bulkTagId)
    setTags(prev => prev.map(t =>
      t.id === bulkTagId ? { ...t, usageCount: t.usageCount + bulkSelectedEntities.length } : t
    ))
    setBulkDialogOpen(false)
    setBulkTagId('')
    setBulkSelectedEntities([])
    toast.success(`Tag "${tag?.name}" assigné à ${bulkSelectedEntities.length} élément(s)`)
  }

  const openEditDialog = (tag: TagItem) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color, icon: tag.icon, category: tag.category })
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
            <p className="text-xs text-muted-foreground">{tags.length} tags</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadDefaults}
            className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
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
                      style={{ backgroundColor: tag.color, ringColor: tag.color }}
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
                        onClick={() => handleDelete(tag)}
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
            >
              Annuler
            </Button>
            <Button
              onClick={editDialogOpen ? handleEdit : handleCreate}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {editDialogOpen ? 'Sauvegarder' : 'Créer'}
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
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleBulkAssign}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
