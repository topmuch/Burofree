'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Mail, FileSpreadsheet, LayoutTemplate, MessageSquare,
  Plus, Edit, Trash2, Copy, Eye, Sparkles, Search, Tag
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useAppStore, type Template } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Constants ────────────────────────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  contract: 'Contrat',
  quote: 'Devis',
  email: 'Email',
  project_structure: 'Structure de projet',
  client_response: 'Réponse client',
}

const typeColors: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  contract: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', iconBg: 'bg-blue-500/15' },
  quote: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', iconBg: 'bg-amber-500/15' },
  email: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', iconBg: 'bg-purple-500/15' },
  project_structure: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', iconBg: 'bg-emerald-500/15' },
  client_response: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', iconBg: 'bg-rose-500/15' },
}

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText,
  quote: FileSpreadsheet,
  email: Mail,
  project_structure: LayoutTemplate,
  client_response: MessageSquare,
}

const categoryLabels: Record<string, string> = {
  general: 'Général',
  legal: 'Juridique',
  commercial: 'Commercial',
  followup: 'Suivi',
  onboarding: 'Accueil',
  contrat: 'Contrat',
  devis: 'Devis',
  relance: 'Relance',
  projet: 'Projet',
  suivi: 'Suivi',
}

const iconOptions = [
  { value: 'FileText', label: 'Document', icon: FileText },
  { value: 'Mail', label: 'Email', icon: Mail },
  { value: 'FileSpreadsheet', label: 'Tableur', icon: FileSpreadsheet },
  { value: 'LayoutTemplate', label: 'Mise en page', icon: LayoutTemplate },
  { value: 'MessageSquare', label: 'Message', icon: MessageSquare },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVariables(content: string): string[] {
  const pattern = /\{(\w+)\}/g
  const vars: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1])
    }
  }
  return vars
}

function renderTypeIcon(iconName: string | null, fallbackType: string, className?: string) {
  const iconMap: Record<string, React.ReactNode> = {
    FileText: <FileText className={className} />,
    Mail: <Mail className={className} />,
    FileSpreadsheet: <FileSpreadsheet className={className} />,
    LayoutTemplate: <LayoutTemplate className={className} />,
    MessageSquare: <MessageSquare className={className} />,
  }
  if (iconName && iconMap[iconName]) return iconMap[iconName]
  const fallbackIcon = typeIcons[fallbackType]
  const FallbackIcon = fallbackIcon || FileText
  return <FallbackIcon className={className} />
}

function parseVariables(varsStr: string): string[] {
  try {
    const parsed = JSON.parse(varsStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function renderContent(content: string, values: Record<string, string>): string {
  let result = content
  for (const [key, val] of Object.entries(values)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), val || `{${key}}`)
  }
  return result
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

function TemplateFormDialog({
  open,
  onOpenChange,
  editingTemplate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTemplate: Template | null
}) {
  const { createTemplate, updateTemplate } = useAppStore()
  const isEditing = !!editingTemplate

  const [name, setName] = useState('')
  const [type, setType] = useState('contract')
  const [category, setCategory] = useState('general')
  const [icon, setIcon] = useState<string>('')
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens/changes
  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setName(editingTemplate.name)
        setType(editingTemplate.type)
        setCategory(editingTemplate.category)
        setIcon(editingTemplate.icon || '')
        setContent(editingTemplate.content)
        setDescription(editingTemplate.description || '')
      } else {
        setName('')
        setType('contract')
        setCategory('general')
        setIcon('')
        setContent('')
        setDescription('')
      }
      setShowPreview(false)
    }
  }, [open, editingTemplate])

  const detectedVars = useMemo(() => extractVariables(content), [content])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    if (!content.trim()) {
      toast.error('Le contenu est requis')
      return
    }
    setSaving(true)
    try {
      const data: Partial<Template> = {
        name,
        type,
        category,
        icon: icon || null,
        content,
        description: description || null,
        variables: JSON.stringify(detectedVars),
      }
      if (isEditing && editingTemplate) {
        await updateTemplate(editingTemplate.id, data)
        toast.success('Template mis à jour')
      } else {
        await createTemplate(data)
        toast.success('Template créé')
      }
      onOpenChange(false)
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-emerald-400" />
            {isEditing ? 'Éditer le template' : 'Nouveau template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du template"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category & Icon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Icône (optionnel)</Label>
              <Select value={icon || '_none'} onValueChange={(v) => setIcon(v === '_none' ? '' : v)}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte du template"
              className="bg-secondary"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contenu *</Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-400 hover:text-emerald-300 h-7"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {showPreview ? 'Éditer' : 'Aperçu'}
              </Button>
            </div>
            {showPreview ? (
              <div className="bg-secondary/50 border border-border rounded-md p-4 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar">
                <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Contenu du template... Utilisez {variable} pour insérer des variables dynamiques"
                className="bg-secondary min-h-[200px] font-mono text-sm"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Utilisez la syntaxe <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded">{'{nom_variable}'}</code> pour définir des variables dynamiques.
            </p>
          </div>

          {/* Detected Variables */}
          {detectedVars.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Variables détectées</Label>
              <div className="flex flex-wrap gap-1.5">
                {detectedVars.map((v) => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {saving ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Apply Template Dialog ────────────────────────────────────────────────────

function ApplyTemplateDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: Template | null
}) {
  const { applyTemplate } = useAppStore()
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [applying, setApplying] = useState(false)

  const variables = useMemo(() => {
    if (!template) return []
    return parseVariables(template.variables)
  }, [template])

  // Reset on open
  useEffect(() => {
    if (open) {
      setVariableValues({})
      setCopied(false)
    }
  }, [open])

  const renderedContent = useMemo(() => {
    if (!template) return ''
    return renderContent(template.content, variableValues)
  }, [template, variableValues])

  const allFilled = variables.every((v) => variableValues[v]?.trim())

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedContent)
      setCopied(true)
      toast.success('Copié dans le presse-papier')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erreur lors de la copie')
    }
  }, [renderedContent])

  const handleApply = useCallback(async () => {
    if (!template) return
    setApplying(true)
    try {
      const result = await applyTemplate(template.id, variableValues)
      if (result.missing.length > 0) {
        toast.warning(`Variables manquantes : ${result.missing.join(', ')}`)
      } else {
        await navigator.clipboard.writeText(result.content)
        toast.success('Template appliqué et copié !')
        onOpenChange(false)
      }
    } catch {
      toast.error("Erreur lors de l'application")
    } finally {
      setApplying(false)
    }
  }, [template, variableValues, applyTemplate, onOpenChange])

  if (!template) return null

  const colors = typeColors[template.type] || typeColors.contract

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-lg', colors.iconBg)}>
              {renderTypeIcon(template.icon, template.type, cn('w-4 h-4', colors.text))}
            </div>
            Appliquer : {template.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Template Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-xs', colors.bg, colors.text, 'border', colors.border)}>
              {typeLabels[template.type] || template.type}
            </Badge>
            {template.isDefault && (
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                <Sparkles className="w-3 h-3 mr-1" />
                Par défaut
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {categoryLabels[template.category] || template.category}
            </Badge>
          </div>

          {/* Variable Inputs */}
          {variables.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Variables</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variables.map((v) => (
                  <div key={v} className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {v}
                    </Label>
                    <Input
                      value={variableValues[v] || ''}
                      onChange={(e) =>
                        setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))
                      }
                      placeholder={`Valeur pour {${v}}`}
                      className="bg-secondary text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Aperçu en direct</Label>
            <div className="bg-secondary/50 border border-border rounded-lg p-4 min-h-[160px] max-h-[300px] overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {renderedContent}
              </pre>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copié !' : 'Copier'}
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || !allFilled}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {applying ? 'Application...' : 'Utiliser'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onApply,
  onEdit,
  onDelete,
}: {
  template: Template
  onApply: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const colors = typeColors[template.type] || typeColors.contract
  const variables = useMemo(() => parseVariables(template.variables), [template.variables])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card className={cn(
        'border transition-all duration-200 cursor-pointer group',
        hovered ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 'border-border'
      )}>
        <CardContent className="p-4">
          {/* Hover Actions */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-3 right-3 flex items-center gap-1 z-10"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs bg-background/90 backdrop-blur-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={(e) => { e.stopPropagation(); onApply() }}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Appliquer
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-background/90 backdrop-blur-sm"
                  onClick={(e) => { e.stopPropagation(); onEdit() }}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-background/90 backdrop-blur-sm text-red-400 hover:text-red-300"
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg flex-shrink-0', colors.iconBg)}>
              {renderTypeIcon(template.icon, template.type, cn('w-5 h-5', colors.text))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{template.name}</p>
                {template.isDefault && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-500/30 text-emerald-400 flex-shrink-0">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    Par défaut
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge className={cn('text-[10px] h-4', colors.bg, colors.text, 'border', colors.border)}>
                  {typeLabels[template.type] || template.type}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-4">
                  {categoryLabels[template.category] || template.category}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {template.description && (
            <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2">{template.description}</p>
          )}

          {/* Variables + Usage Count */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              {variables.slice(0, 3).map((v) => (
                <span
                  key={v}
                  className="text-[10px] text-emerald-400/70 bg-emerald-500/5 px-1.5 py-0.5 rounded"
                >
                  {`{${v}}`}
                </span>
              ))}
              {variables.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{variables.length - 3}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0 ml-2">
              <Copy className="w-3 h-3" />
              {template.usageCount} utilisation{template.usageCount !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function TemplatesPanel() {
  const { templates, fetchTemplates, deleteTemplate, seedTemplates } = useAppStore()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [applyTemplate_data, setApplyTemplate] = useState<Template | null>(null)
  const [seeding, setSeeding] = useState(false)

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase())
      const matchCategory = categoryFilter === 'all' || t.type === categoryFilter
      return matchSearch && matchCategory
    })
  }, [templates, search, categoryFilter])

  // Stats
  const stats = useMemo(() => {
    const byType: Record<string, number> = {}
    templates.forEach((t) => {
      byType[t.type] = (byType[t.type] || 0) + 1
    })
    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0)
    const defaultCount = templates.filter((t) => t.isDefault).length
    return { byType, totalUsage, defaultCount, total: templates.length }
  }, [templates])

  // Handlers
  const handleSeed = useCallback(async () => {
    setSeeding(true)
    try {
      await seedTemplates()
      toast.success('Templates par défaut ajoutés')
    } catch {
      toast.error('Erreur lors de l\'ajout des templates')
    } finally {
      setSeeding(false)
    }
  }, [seedTemplates])

  const handleEdit = useCallback((template: Template) => {
    setEditingTemplate(template)
    setFormOpen(true)
  }, [])

  const handleCreate = useCallback(() => {
    setEditingTemplate(null)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteTemplate(id)
      toast.success('Template supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }, [deleteTemplate])

  const handleFormClose = useCallback((open: boolean) => {
    setFormOpen(open)
    if (!open) setEditingTemplate(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: 'Total templates',
            value: String(stats.total),
            icon: LayoutTemplate,
            accent: 'text-emerald-400',
            bgAccent: 'bg-emerald-500/10',
            borderAccent: 'border-emerald-500/20',
          },
          {
            title: 'Utilisations',
            value: String(stats.totalUsage),
            icon: Copy,
            accent: 'text-amber-400',
            bgAccent: 'bg-amber-500/10',
            borderAccent: 'border-amber-500/20',
          },
          {
            title: 'Templates par défaut',
            value: String(stats.defaultCount),
            icon: Sparkles,
            accent: 'text-purple-400',
            bgAccent: 'bg-purple-500/10',
            borderAccent: 'border-purple-500/20',
          },
          {
            title: 'Contrats',
            value: String(stats.byType['contract'] || 0),
            icon: FileText,
            accent: 'text-blue-400',
            bgAccent: 'bg-blue-500/10',
            borderAccent: 'border-blue-500/20',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={cn('border', stat.borderAccent)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', stat.bgAccent)}>
                    <stat.icon className={cn('w-4 h-4', stat.accent)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className={cn('text-lg font-bold', stat.accent)}>{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Top Bar: Search, Category, Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un template..."
              className="pl-9 bg-secondary"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-secondary text-sm">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {seeding ? 'Ajout...' : 'Templates par défaut'}
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouveau template
          </Button>
        </div>
      </div>

      {/* Template Gallery Grid */}
      {filteredTemplates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucun template trouvé</p>
          <p className="text-xs text-muted-foreground mt-1">
            {templates.length === 0
              ? 'Commencez par ajouter des templates par défaut ou créez-en un'
              : 'Essayez de modifier vos filtres'}
          </p>
          {templates.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={handleSeed}
              disabled={seeding}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Ajouter les templates par défaut
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={() => setApplyTemplate(template)}
                onEdit={() => handleEdit(template)}
                onDelete={() => handleDelete(template.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <TemplateFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingTemplate={editingTemplate}
      />

      {/* Apply Template Dialog */}
      <ApplyTemplateDialog
        open={!!applyTemplate_data}
        onOpenChange={(open) => { if (!open) setApplyTemplate(null) }}
        template={applyTemplate_data}
      />
    </div>
  )
}
