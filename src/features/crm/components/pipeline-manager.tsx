'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Settings2, Trash2, GripVertical, Check, X, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { usePipelines, useCreatePipeline, useUpdatePipeline, useDeletePipeline } from '../hooks/use-crm'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  probability: number
}

const defaultStages: PipelineStage[] = [
  { id: 's1', name: 'Qualification', order: 1, color: '#3b82f6', probability: 10 },
  { id: 's2', name: 'Proposition', order: 2, color: '#f59e0b', probability: 40 },
  { id: 's3', name: 'Négociation', order: 3, color: '#8b5cf6', probability: 70 },
  { id: 's4', name: 'Conclusion', order: 4, color: '#10b981', probability: 90 },
]

const colorOptions = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
]

// ─── Component ──────────────────────────────────────────────────────────────

export function PipelineManager() {
  const { data: pipelines, isLoading } = usePipelines()
  const createPipeline = useCreatePipeline()
  const updatePipeline = useUpdatePipeline()
  const deletePipeline = useDeletePipeline()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [newPipeline, setNewPipeline] = useState({ name: '', description: '' })
  const [editStages, setEditStages] = useState<PipelineStage[]>([])

  // ─── Create Pipeline ──────────────────────────────────────────────────────

  const handleCreate = () => {
    createPipeline.mutate({
      name: newPipeline.name,
      description: newPipeline.description || undefined,
      stages: JSON.stringify(defaultStages),
      isDefault: !pipelines?.length,
    }, {
      onSuccess: () => {
        setShowCreateDialog(false)
        setNewPipeline({ name: '', description: '' })
      },
    })
  }

  // ─── Edit Pipeline Stages ─────────────────────────────────────────────────

  const handleEditStages = (pipelineId: string) => {
    const pipeline = pipelines?.find(p => p.id === pipelineId)
    if (!pipeline) return
    try {
      const stages = JSON.parse(pipeline.stages) as PipelineStage[]
      setEditStages(stages)
    } catch {
      setEditStages(defaultStages)
    }
    setEditingPipelineId(pipelineId)
  }

  const addStage = () => {
    const maxOrder = editStages.reduce((max, s) => Math.max(max, s.order), 0)
    setEditStages(prev => [...prev, {
      id: `s${Date.now()}`,
      name: 'Nouvelle étape',
      order: maxOrder + 1,
      color: colorOptions[editStages.length % colorOptions.length],
      probability: 0,
    }])
  }

  const removeStage = (stageId: string) => {
    setEditStages(prev => prev.filter(s => s.id !== stageId))
  }

  const updateStage = (stageId: string, field: keyof PipelineStage, value: string | number) => {
    setEditStages(prev => prev.map(s => s.id === stageId ? { ...s, [field]: value } : s))
  }

  const saveStages = () => {
    if (!editingPipelineId) return
    updatePipeline.mutate({
      id: editingPipelineId,
      data: { stages: editStages },
    }, {
      onSuccess: () => setEditingPipelineId(null),
    })
  }

  // ─── Set Default Pipeline ─────────────────────────────────────────────────

  const setDefaultPipeline = (id: string) => {
    updatePipeline.mutate({ id, data: { isDefault: true } })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full bg-zinc-800/50 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Pipelines</h3>
        <Button
          size="sm"
          className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Pipeline
        </Button>
      </div>

      {/* Pipeline List */}
      {!pipelines?.length ? (
        <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
          <p className="text-zinc-400">Aucun pipeline créé</p>
          <Button
            variant="ghost"
            onClick={() => setShowCreateDialog(true)}
            className="mt-3 text-emerald-400"
          >
            Créer votre premier pipeline
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {pipelines.map(pipeline => {
            let stages: PipelineStage[] = []
            try { stages = JSON.parse(pipeline.stages) } catch { stages = [] }

            return (
              <Card key={pipeline.id} className="bg-zinc-900/50 border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-zinc-200">{pipeline.name}</h4>
                    {pipeline.isDefault && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] border-0">
                        <Star className="w-3 h-3 mr-0.5" /> Par défaut
                      </Badge>
                    )}
                    <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-zinc-700">
                      {pipeline._count?.deals || 0} affaires
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {!pipeline.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-500 hover:text-emerald-400"
                        onClick={() => setDefaultPipeline(pipeline.id)}
                        title="Définir par défaut"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                      onClick={() => handleEditStages(pipeline.id)}
                      title="Modifier les étapes"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400"
                      onClick={() => deletePipeline.mutate(pipeline.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Stage Visualization */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {stages.sort((a, b) => a.order - b.order).map((stage, idx) => (
                    <div key={stage.id} className="flex items-center">
                      <div
                        className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 min-w-[80px]"
                        style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                        <span className="opacity-60">{stage.probability}%</span>
                      </div>
                      {idx < stages.length - 1 && (
                        <div className="w-4 h-px bg-zinc-700 mx-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Pipeline Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Nouveau pipeline</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Nom du pipeline *"
              value={newPipeline.name}
              onChange={e => setNewPipeline(s => ({ ...s, name: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-200"
            />
            <Input
              placeholder="Description (optionnel)"
              value={newPipeline.description}
              onChange={e => setNewPipeline(s => ({ ...s, description: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-200"
            />
            <p className="text-xs text-zinc-500">
              Étapes par défaut: Qualification → Proposition → Négociation → Conclusion
            </p>
            <Button
              onClick={handleCreate}
              disabled={!newPipeline.name || createPipeline.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createPipeline.isPending ? 'Création...' : 'Créer le pipeline'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Stages Dialog */}
      <Dialog open={!!editingPipelineId} onOpenChange={(open) => { if (!open) setEditingPipelineId(null) }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Modifier les étapes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {editStages.sort((a, b) => a.order - b.order).map((stage, idx) => (
              <motion.div
                key={stage.id}
                layout
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 border border-zinc-800"
              >
                <GripVertical className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <div className="flex gap-2 flex-1 flex-wrap">
                  <Input
                    value={stage.name}
                    onChange={e => updateStage(stage.id, 'name', e.target.value)}
                    className="bg-zinc-900/50 border-zinc-700 text-zinc-200 h-8 text-sm w-[120px]"
                  />
                  <Input
                    type="number"
                    value={stage.probability}
                    onChange={e => updateStage(stage.id, 'probability', Number(e.target.value))}
                    className="bg-zinc-900/50 border-zinc-700 text-zinc-200 h-8 text-sm w-[70px]"
                    min={0}
                    max={100}
                  />
                  <span className="text-xs text-zinc-500 self-center">%</span>
                  {/* Color Picker */}
                  <div className="flex gap-1 self-center">
                    {colorOptions.slice(0, 5).map(c => (
                      <button
                        key={c}
                        className={`w-4 h-4 rounded-full border-2 ${stage.color === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        onClick={() => updateStage(stage.id, 'color', c)}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-red-400 flex-shrink-0"
                  onClick={() => removeStage(stage.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            ))}

            <Button
              variant="outline"
              onClick={addStage}
              className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              <Plus className="w-4 h-4 mr-1" /> Ajouter une étape
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditingPipelineId(null)} className="text-zinc-400">
              Annuler
            </Button>
            <Button
              onClick={saveStages}
              disabled={updatePipeline.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updatePipeline.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
