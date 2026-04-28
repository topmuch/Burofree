'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Flag,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  rollout: number
  segments: string[]
  updatedAt: string
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  /* ── New Flag Form State ─────────────────────────────────────────────────── */

  const [newFlag, setNewFlag] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    rollout: 0,
    segments: '',
  })
  const [creating, setCreating] = useState(false)

  /* ── Fetch Flags ─────────────────────────────────────────────────────────── */

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/feature-flags')
      if (res.ok) {
        const json = await res.json()
        setFlags(json.flags ?? json ?? [])
      }
    } catch (err) {
      console.error('Erreur chargement feature flags :', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  /* ── Create Flag ─────────────────────────────────────────────────────────── */

  const handleCreate = async () => {
    if (!newFlag.key || !newFlag.name) return
    setCreating(true)
    try {
      const res = await fetch('/api/superadmin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newFlag.key,
          name: newFlag.name,
          description: newFlag.description || undefined,
          enabled: newFlag.enabled,
          rollout: newFlag.rollout,
          segments: newFlag.segments
            ? newFlag.segments.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      })
      if (res.ok) {
        setNewFlag({ key: '', name: '', description: '', enabled: false, rollout: 0, segments: '' })
        setShowCreate(false)
        fetchFlags()
      }
    } catch (err) {
      console.error('Erreur création feature flag :', err)
    } finally {
      setCreating(false)
    }
  }

  /* ── Update Flag ─────────────────────────────────────────────────────────── */

  const updateFlag = async (id: string, updates: Partial<FeatureFlag>) => {
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    )
    try {
      const res = await fetch(`/api/superadmin/feature-flags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        // Revert on failure
        fetchFlags()
      }
    } catch {
      fetchFlags()
    }
  }

  /* ── Filtered Flags ──────────────────────────────────────────────────────── */

  const filteredFlags = flags.filter((f) => {
    if (filter === 'enabled' && !f.enabled) return false
    if (filter === 'disabled' && f.enabled) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        f.key.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Flag className="size-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Feature Flags</h2>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {showCreate ? <ChevronUp className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          Nouveau flag
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Rechercher un flag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Filtre" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="enabled">Activés</SelectItem>
            <SelectItem value="disabled">Désactivés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Create Form (Collapsible) */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-zinc-800 bg-zinc-900 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-100 text-base">Créer un nouveau flag</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Clé</label>
                    <Input
                      placeholder="mon_feature_flag"
                      value={newFlag.key}
                      onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Nom</label>
                    <Input
                      placeholder="Mon Feature Flag"
                      value={newFlag.name}
                      onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                  <Input
                    placeholder="Description optionnelle..."
                    value={newFlag.description}
                    onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Segments (séparés par des virgules)</label>
                  <Input
                    placeholder="beta, premium, enterprise"
                    value={newFlag.segments}
                    onChange={(e) => setNewFlag({ ...newFlag, segments: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={newFlag.enabled}
                      onCheckedChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
                    />
                    <span className="text-sm text-zinc-300">
                      {newFlag.enabled ? 'Activé' : 'Désactivé'}
                    </span>
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newFlag.key || !newFlag.name}
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                    Créer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flags List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : filteredFlags.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">Aucun feature flag trouvé</div>
      ) : (
        <div className="space-y-2">
          {filteredFlags.map((flag) => {
            const isEditing = editingId === flag.id
            return (
              <motion.div
                key={flag.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Card className="border-zinc-800 bg-zinc-900 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm font-mono text-emerald-400 bg-zinc-800 px-2 py-0.5 rounded">
                            {flag.key}
                          </code>
                          <span className="text-sm text-zinc-200 font-medium">{flag.name}</span>
                        </div>
                        {flag.description && (
                          <p className="text-xs text-zinc-500 mt-1">{flag.description}</p>
                        )}
                        {/* Segments */}
                        {flag.segments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {flag.segments.map((seg) => (
                              <Badge
                                key={seg}
                                className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs"
                                variant="outline"
                              >
                                {seg}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Toggle + Rollout */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={(checked) => updateFlag(flag.id, { enabled: checked })}
                          />
                          <span className="text-xs text-zinc-400">
                            {flag.enabled ? 'Activé' : 'Désactivé'}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-500 hover:text-zinc-200"
                          onClick={() => setEditingId(isEditing ? null : flag.id)}
                        >
                          {isEditing ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Rollout Bar (always visible) */}
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-16">Rollout</span>
                      <Progress
                        value={flag.rollout}
                        className="flex-1 h-2 bg-zinc-800 [&>div]:bg-emerald-500"
                      />
                      <span className="text-xs text-zinc-300 font-mono w-10 text-right">{flag.rollout}%</span>
                    </div>

                    {/* Expanded Edit Panel */}
                    <AnimatePresence>
                      {isEditing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 pt-4 border-t border-zinc-800 space-y-4"
                        >
                          <div>
                            <label className="text-xs text-zinc-500 mb-2 block">
                              Pourcentage de déploiement : {flag.rollout}%
                            </label>
                            <Slider
                              value={[flag.rollout]}
                              min={0}
                              max={100}
                              step={1}
                              onValueChange={([val]) => updateFlag(flag.id, { rollout: val })}
                              className="[&_[role=slider]]:bg-emerald-500"
                            />
                          </div>
                          <Separator className="bg-zinc-800" />
                          <p className="text-xs text-zinc-500">
                            Dernière modification : {new Date(flag.updatedAt).toLocaleString('fr-FR')}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
