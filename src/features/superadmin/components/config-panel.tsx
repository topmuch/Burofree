'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Save,
  Plus,
  Loader2,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface ConfigEntry {
  id: string
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json'
  category: 'general' | 'billing' | 'features' | 'legal' | 'email'
  description: string | null
  updatedAt: string
}

type ConfigCategory = ConfigEntry['category']

/* ─── Constants ────────────────────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<ConfigCategory, string> = {
  general: 'Général',
  billing: 'Facturation',
  features: 'Fonctionnalités',
  legal: 'Juridique',
  email: 'Email',
}

const CATEGORY_ICONS: Record<ConfigCategory, string> = {
  general: '⚙️',
  billing: '💳',
  features: '🧩',
  legal: '⚖️',
  email: '📧',
}

const TYPE_COLORS: Record<string, string> = {
  string: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  number: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  boolean: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  json: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function ConfigPanel() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<ConfigCategory | 'all'>('all')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)

  /* ── New Config Form State ───────────────────────────────────────────────── */

  const [newConfig, setNewConfig] = useState({
    key: '',
    value: '',
    type: 'string' as ConfigEntry['type'],
    category: 'general' as ConfigCategory,
    description: '',
  })
  const [creating, setCreating] = useState(false)

  /* ── Fetch Configs ───────────────────────────────────────────────────────── */

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/config')
      if (res.ok) {
        const json = await res.json()
        setConfigs(json.configs ?? json ?? [])
        // Check maintenance mode from config
        const maintenanceConfig = (json.configs ?? json ?? []).find(
          (c: ConfigEntry) => c.key === 'maintenance_mode',
        )
        if (maintenanceConfig) {
          setMaintenanceMode(maintenanceConfig.value === 'true')
        }
      }
    } catch (err) {
      console.error('Erreur chargement config :', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  /* ── Save Config ─────────────────────────────────────────────────────────── */

  const saveConfig = async (entry: ConfigEntry) => {
    setSavingKey(entry.key)
    // Optimistic update
    setConfigs((prev) =>
      prev.map((c) => (c.key === entry.key ? { ...c, value: editValue } : c)),
    )
    try {
      const res = await fetch(`/api/superadmin/config/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: entry.key,
          value: editValue,
          type: entry.type,
          category: entry.category,
        }),
      })
      if (!res.ok) {
        // Revert on failure
        fetchConfigs()
      }
    } catch {
      fetchConfigs()
    } finally {
      setSavingKey(null)
      setEditingKey(null)
    }
  }

  /* ── Maintenance Mode Toggle ─────────────────────────────────────────────── */

  const toggleMaintenance = async (enabled: boolean) => {
    setMaintenanceLoading(true)
    // Optimistic
    setMaintenanceMode(enabled)
    try {
      const res = await fetch('/api/superadmin/config/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) {
        setMaintenanceMode(!enabled)
      }
    } catch {
      setMaintenanceMode(!enabled)
    } finally {
      setMaintenanceLoading(false)
    }
  }

  /* ── Create New Config ───────────────────────────────────────────────────── */

  const handleCreate = async () => {
    if (!newConfig.key || !newConfig.value) return
    setCreating(true)
    try {
      const res = await fetch('/api/superadmin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })
      if (res.ok) {
        setNewConfig({ key: '', value: '', type: 'string', category: 'general', description: '' })
        setShowAddForm(false)
        fetchConfigs()
      }
    } catch (err) {
      console.error('Erreur création config :', err)
    } finally {
      setCreating(false)
    }
  }

  /* ── Filtered Configs ────────────────────────────────────────────────────── */

  const filteredConfigs = activeCategory === 'all'
    ? configs
    : configs.filter((c) => c.category === activeCategory)

  const groupedConfigs = (activeCategory === 'all'
    ? (['general', 'billing', 'features', 'legal', 'email'] as ConfigCategory[])
    : [activeCategory as ConfigCategory]
  ).reduce(
    (acc, cat) => {
      const items = filteredConfigs.filter((c) => c.category === cat)
      if (items.length > 0) acc[cat] = items
      return acc
    },
    {} as Record<string, ConfigEntry[]>,
  )

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Settings className="size-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Configuration plateforme</h2>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {showAddForm ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          Ajouter
        </Button>
      </div>

      {/* Maintenance Mode Toggle */}
      <Card className={`border-2 shadow-none ${maintenanceMode ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`size-5 ${maintenanceMode ? 'text-amber-400' : 'text-zinc-600'}`} />
              <div>
                <p className="text-sm font-semibold text-zinc-100">Mode maintenance</p>
                <p className="text-xs text-zinc-500">
                  {maintenanceMode
                    ? 'La plateforme est en maintenance. Seuls les superadmins y ont accès.'
                    : 'La plateforme est opérationnelle.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {maintenanceLoading && <Loader2 className="size-4 animate-spin text-amber-400" />}
              <Switch
                checked={maintenanceMode}
                onCheckedChange={toggleMaintenance}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveCategory('all')}
          className={activeCategory === 'all'
            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
            : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'}
        >
          Toutes
        </Button>
        {(Object.entries(CATEGORY_LABELS) as [ConfigCategory, string][]).map(([cat, label]) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'}
          >
            {CATEGORY_ICONS[cat]} {label}
          </Button>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-zinc-800 bg-zinc-900 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-100 text-base">Nouvelle configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Clé</label>
                    <Input
                      placeholder="ma_config"
                      value={newConfig.key}
                      onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Valeur</label>
                    <Input
                      placeholder="Valeur..."
                      value={newConfig.value}
                      onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                    <Select
                      value={newConfig.type}
                      onValueChange={(v) => setNewConfig({ ...newConfig, type: v as ConfigEntry['type'] })}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Catégorie</label>
                    <Select
                      value={newConfig.category}
                      onValueChange={(v) => setNewConfig({ ...newConfig, category: v as ConfigCategory })}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {(Object.entries(CATEGORY_LABELS) as [ConfigCategory, string][]).map(([cat, label]) => (
                          <SelectItem key={cat} value={cat}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                    <Input
                      placeholder="Description optionnelle..."
                      value={newConfig.description}
                      onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newConfig.key || !newConfig.value}
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Config Groups */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : Object.keys(groupedConfigs).length === 0 ? (
        <div className="py-20 text-center text-zinc-500">Aucune configuration trouvée</div>
      ) : (
        (Object.entries(groupedConfigs) as [ConfigCategory, ConfigEntry[]][]).map(([category, entries]) => (
          <Card key={category} className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                <span>{CATEGORY_ICONS[category]}</span>
                {CATEGORY_LABELS[category]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {entries.map((entry) => {
                const isEditing = editingKey === entry.key
                const isSaving = savingKey === entry.key
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-zinc-800 last:border-0"
                  >
                    {/* Key */}
                    <div className="sm:w-48 shrink-0">
                      <code className="text-sm font-mono text-emerald-400">{entry.key}</code>
                    </div>

                    {/* Value (editable) */}
                    <div className="flex-1 flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveConfig(entry)
                            if (e.key === 'Escape') setEditingKey(null)
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm text-zinc-300 font-mono truncate max-w-[300px]">
                          {entry.type === 'boolean'
                            ? entry.value === 'true' ? '✓ true' : '✗ false'
                            : entry.value}
                        </span>
                      )}
                    </div>

                    {/* Type Badge */}
                    <Badge
                      className={`${TYPE_COLORS[entry.type] || TYPE_COLORS.string} text-xs shrink-0`}
                      variant="outline"
                    >
                      {entry.type}
                    </Badge>

                    {/* Description */}
                    {entry.description && (
                      <span className="text-xs text-zinc-500 hidden lg:block max-w-[200px] truncate">
                        {entry.description}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveConfig(entry)}
                            disabled={isSaving}
                            className="text-emerald-400 hover:text-emerald-300 h-8 w-8 p-0"
                          >
                            {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingKey(null)}
                            className="text-zinc-500 hover:text-zinc-200 h-8 w-8 p-0"
                          >
                            <X className="size-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingKey(entry.key)
                            setEditValue(entry.value)
                          }}
                          className="text-zinc-500 hover:text-zinc-200 h-8"
                        >
                          <Save className="size-3 mr-1" />
                          Modifier
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
