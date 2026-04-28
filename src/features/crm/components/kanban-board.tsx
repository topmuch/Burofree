'use client'

import { useState, useMemo } from 'react'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import {
  Plus, DollarSign, Calendar, User, GripVertical, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { usePipelines, usePipelineStats, useDeals, useCreateDeal, useUpdateDealStage } from '../hooks/use-crm'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  probability: number
}

interface DealCard {
  id: string
  title: string
  value: number
  currency: string
  probability: number
  stageId: string
  expectedCloseDate: string | null
  contact?: { firstName: string | null; lastName: string; company: string | null; avatar: string | null }
  assignedTo?: { name: string | null; avatar: string | null }
}

// ─── Sortable Deal Card ─────────────────────────────────────────────────────

function SortableDealCard({ deal, onEdit }: { deal: DealCard; onEdit?: (deal: DealCard) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stageId: deal.stageId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const contactName = deal.contact
    ? [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(' ')
    : null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="bg-zinc-900/80 border-zinc-800 p-3 cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors"
      onClick={() => onEdit?.(deal)}
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="text-zinc-600 hover:text-zinc-400 mt-0.5">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{deal.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
              {deal.value.toLocaleString('fr-FR')}
            </span>
            <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-zinc-700">
              {deal.probability}%
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
            {contactName && (
              <span className="flex items-center gap-1 truncate">
                <User className="w-3 h-3 flex-shrink-0" />{contactName}
              </span>
            )}
            {deal.expectedCloseDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(deal.expectedCloseDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Kanban Column ──────────────────────────────────────────────────────────

function KanbanColumn({
  stage, deals, onAddDeal, onEditDeal,
}: {
  stage: PipelineStage
  deals: DealCard[]
  onAddDeal?: (stageId: string) => void
  onEditDeal?: (deal: DealCard) => void
}) {
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-medium text-zinc-200">{stage.name}</h3>
          <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-zinc-700 h-5 min-w-[20px]">
            {deals.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-emerald-400"
          onClick={() => onAddDeal?.(stage.id)}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Column value */}
      <div className="px-1 mb-2">
        <p className="text-xs text-zinc-500">
          {totalValue.toLocaleString('fr-FR')} € · {stage.probability}% prob.
        </p>
      </div>

      {/* Cards */}
      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 px-0.5 min-h-[100px]">
          {deals.map(deal => (
            <SortableDealCard key={deal.id} deal={deal} onEdit={onEditDeal} />
          ))}
          {deals.length === 0 && (
            <div className="h-20 rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center">
              <p className="text-xs text-zinc-600">Glisser une affaire ici</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Main Kanban Board ──────────────────────────────────────────────────────

export function KanbanBoard() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [activeDealId, setActiveDealId] = useState<string | null>(null)
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [createStageId, setCreateStageId] = useState('')

  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines()
  const { data: stats } = usePipelineStats(selectedPipelineId)
  const { data: dealsData, isLoading: dealsLoading } = useDeals(
    selectedPipelineId ? { pipelineId: selectedPipelineId, status: 'open', limit: '100' } : { limit: '0' },
  )
  const createDealMutation = useCreateDeal()
  const updateDealStageMutation = useUpdateDealStage()

  // Auto-select default pipeline
  const defaultPipeline = pipelines?.find(p => p.isDefault) || pipelines?.[0]
  const currentPipeline = selectedPipelineId
    ? pipelines?.find(p => p.id === selectedPipelineId)
    : defaultPipeline

  // Sync selectedPipelineId when pipelines load
  if (pipelines?.length && !selectedPipelineId && defaultPipeline) {
    setSelectedPipelineId(defaultPipeline.id)
  }

  const stages: PipelineStage[] = useMemo(() => {
    if (!currentPipeline) return []
    try { return JSON.parse(currentPipeline.stages) } catch { return [] }
  }, [currentPipeline])

  const deals = dealsData?.data || []

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map: Record<string, DealCard[]> = {}
    stages.forEach(s => { map[s.id] = [] })
    deals.forEach((d: any) => {
      if (map[d.stageId]) {
        map[d.stageId].push(d)
      }
    })
    return map
  }, [stages, deals])

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // ─── Drag Handlers ────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDealId(null)
    const { active, over } = event
    if (!over) return

    const dealId = active.id as string
    const deal = deals.find((d: any) => d.id === dealId)
    if (!deal) return

    // Find target stage
    let targetStageId: string | null = null
    if (over.data?.current?.stageId) {
      targetStageId = over.data.current.stageId as string
    } else {
      // Dropped on another deal card — use that deal's stage
      const overDeal = deals.find((d: any) => d.id === over.id)
      if (overDeal) targetStageId = overDeal.stageId
    }

    if (targetStageId && targetStageId !== deal.stageId) {
      updateDealStageMutation.mutate({ dealId, stageId: targetStageId })
    }
  }

  // ─── Create Deal ──────────────────────────────────────────────────────────

  const [newDeal, setNewDeal] = useState({
    title: '', value: 0, description: '', contactId: '',
  })

  const handleCreateDeal = () => {
    if (!currentPipeline || !createStageId) return
    createDealMutation.mutate({
      pipelineId: currentPipeline.id,
      stageId: createStageId,
      title: newDeal.title,
      value: newDeal.value,
      description: newDeal.description || undefined,
    }, {
      onSuccess: () => {
        setShowCreateDeal(false)
        setNewDeal({ title: '', value: 0, description: '', contactId: '' })
      },
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (pipelinesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 bg-zinc-800/50" />
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-[280px] flex-shrink-0 bg-zinc-800/50 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!pipelines?.length) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-zinc-300 font-medium">Aucun pipeline</p>
        <p className="text-zinc-500 text-sm mt-1">Créez un pipeline dans l&apos;onglet Pipeline pour commencer</p>
      </Card>
    )
  }

  const activeDeal = activeDealId ? deals.find((d: any) => d.id === activeDealId) : null

  return (
    <div className="space-y-4">
      {/* Pipeline selector + stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {pipelines.map(p => (
            <Button
              key={p.id}
              variant={p.id === currentPipeline?.id ? 'default' : 'outline'}
              size="sm"
              className={p.id === currentPipeline?.id
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }
              onClick={() => setSelectedPipelineId(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>

        {stats && (
          <div className="flex gap-4 text-xs text-zinc-500 ml-auto">
            <span>{stats.totalDeals} affaires</span>
            <span>Pipeline: <span className="text-emerald-400 font-medium">{stats.totalPipelineValue?.toLocaleString('fr-FR')} €</span></span>
            <span>Probable: <span className="text-amber-400 font-medium">{stats.totalWeightedValue?.toLocaleString('fr-FR')} €</span></span>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {stages.sort((a, b) => a.order - b.order).map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                onAddDeal={(stageId) => {
                  setCreateStageId(stageId)
                  setShowCreateDeal(true)
                }}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeDeal ? (
            <Card className="bg-zinc-900/90 border-emerald-500/30 p-3 shadow-lg shadow-emerald-500/10 rotate-2">
              <p className="text-sm font-medium text-zinc-200">{activeDeal.title}</p>
              <p className="text-sm text-emerald-400 mt-1">{activeDeal.value?.toLocaleString('fr-FR')} €</p>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create Deal Dialog */}
      <Dialog open={showCreateDeal} onOpenChange={setShowCreateDeal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Nouvelle affaire</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Titre de l'affaire *"
              value={newDeal.title}
              onChange={e => setNewDeal(s => ({ ...s, title: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-200"
            />
            <Input
              placeholder="Valeur (€)"
              type="number"
              value={newDeal.value || ''}
              onChange={e => setNewDeal(s => ({ ...s, value: Number(e.target.value) || 0 }))}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-200"
            />
            <Textarea
              placeholder="Description (optionnel)"
              value={newDeal.description}
              onChange={e => setNewDeal(s => ({ ...s, description: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-200 resize-none"
            />
            <Button
              onClick={handleCreateDeal}
              disabled={!newDeal.title || createDealMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createDealMutation.isPending ? 'Création...' : 'Créer l\'affaire'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
