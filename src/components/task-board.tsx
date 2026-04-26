'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAppStore, type Task } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  Clock,
  Calendar,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Tag,
  AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format, isToday, isPast, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Column Definitions ──────────────────────────────────────
const COLUMNS = [
  { id: 'todo', label: 'À faire', color: 'bg-zinc-500' },
  { id: 'in_progress', label: 'En cours', color: 'bg-amber-500' },
  { id: 'waiting_client', label: 'En attente client', color: 'bg-purple-500' },
  { id: 'done', label: 'Terminé', color: 'bg-emerald-500' },
] as const

type ColumnId = (typeof COLUMNS)[number]['id']

// ─── Priority Config ─────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgente', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  high: { label: 'Élevée', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  medium: { label: 'Moyenne', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  low: { label: 'Basse', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
}

// ─── Helpers ─────────────────────────────────────────────────
function formatHours(minutes: number | null): string {
  if (!minutes) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

function formatDueDate(dateStr: string | null): { text: string; className: string } {
  if (!dateStr) return { text: '', className: '' }
  try {
    const date = parseISO(dateStr)
    const text = format(date, 'd MMM', { locale: fr })
    if (isPast(date) && !isToday(date)) return { text, className: 'text-red-400' }
    if (isToday(date)) return { text: "Aujourd'hui", className: 'text-amber-400' }
    return { text, className: 'text-zinc-400' }
  } catch {
    return { text: dateStr, className: 'text-zinc-400' }
  }
}

// ─── Sortable Task Card ──────────────────────────────────────
function SortableTaskCard({
  task,
  projects,
  onExpand,
  isExpanded,
}: {
  task: Task
  projects: { id: string; name: string; color: string }[]
  onExpand: (id: string) => void
  isExpanded: boolean
}) {
  const { updateTask, deleteTask } = useAppStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const due = formatDueDate(task.dueDate)
  const project = task.project || projects.find(p => p.id === task.projectId)

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card
        className="py-0 gap-0 bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors"
        onClick={() => onExpand(task.id)}
      >
        <CardContent className="p-3 space-y-2">
          {/* Title */}
          <p className="text-sm font-medium text-zinc-200 truncate">
            {task.title}
          </p>

          {/* Priority + Due date row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${priority.bg} ${priority.color} font-medium`}>
              {priority.label}
            </span>
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[10px] ${due.className}`}>
                <Calendar className="w-3 h-3" />
                {due.text}
              </span>
            )}
          </div>

          {/* Project tag */}
          {project && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: project.color || '#10b981' }}
              />
              <span className="text-[10px] text-zinc-500 truncate">{project.name}</span>
            </div>
          )}

          {/* Estimated vs Actual time */}
          {(task.estimatedTime || task.actualTime) && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Clock className="w-3 h-3" />
              <span>
                Est: {formatHours(task.estimatedTime)} / Réel: {formatHours(task.actualTime)}
              </span>
            </div>
          )}

          {/* Category */}
          {task.category && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Tag className="w-3 h-3" />
              <span>{task.category}</span>
            </div>
          )}

          {/* Expanded section */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  {task.description && (
                    <p className="text-xs text-zinc-400 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-zinc-400 hover:text-emerald-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        onExpand(task.id)
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTask(task.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Droppable Column ────────────────────────────────────────
function KanbanColumn({
  column,
  tasks,
  projects,
  expandedTask,
  onExpand,
}: {
  column: (typeof COLUMNS)[number]
  tasks: Task[]
  projects: { id: string; name: string; color: string }[]
  expandedTask: string | null
  onExpand: (id: string) => void
}) {
  return (
    <div className="flex flex-col min-w-[280px] w-[280px] md:min-w-[300px] md:w-[300px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
        <h3 className="text-sm font-semibold text-zinc-300">{column.label}</h3>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-zinc-800 text-zinc-400">
          {tasks.length}
        </Badge>
      </div>

      {/* Task list */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 min-h-[120px] p-1 rounded-lg bg-zinc-950/40 border border-zinc-800/50">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-zinc-600">
              Aucune tâche
            </div>
          ) : (
            <AnimatePresence>
              {tasks.map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  projects={projects}
                  onExpand={onExpand}
                  isExpanded={expandedTask === task.id}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Main TaskBoard Component ────────────────────────────────
export function TaskBoard() {
  const { tasks, projects, createTask, updateTask, deleteTask, setActiveTab } = useAppStore()

  // Local state
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    projectId: '',
    category: '',
    estimatedTime: '',
    reminderEnabled: false,
    reminderAt: '',
  })

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchProject = projectFilter === 'all' || task.projectId === projectFilter
      const matchSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      return matchProject && matchSearch
    })
  }, [tasks, projectFilter, searchQuery])

  // Group by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    for (const col of COLUMNS) {
      grouped[col.id] = filteredTasks.filter(t => t.status === col.id)
    }
    // Tasks with unknown status go to "todo"
    const knownStatuses = COLUMNS.map(c => c.id)
    const orphans = filteredTasks.filter(t => !knownStatuses.includes(t.status))
    if (orphans.length > 0) {
      grouped['todo'] = [...(grouped['todo'] || []), ...orphans]
    }
    return grouped
  }, [filteredTasks])

  // Projects list for selectors
  const projectList = useMemo(() =>
    projects.map(p => ({ id: p.id, name: p.name, color: p.color })),
    [projects]
  )

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Optional: handle drag over for visual feedback
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // Find target column
    let targetStatus: string | null = null

    // Check if dropped on a column's task
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask) {
      targetStatus = overTask.status
    } else {
      // Check if dropped on a column directly (column id matches status)
      const colMatch = COLUMNS.find(c => c.id === over.id)
      if (colMatch) {
        targetStatus = colMatch.id
      }
    }

    if (targetStatus && targetStatus !== activeTask.status) {
      updateTask(activeTask.id, { status: targetStatus })
    }
  }, [tasks, updateTask])

  // Toggle expanded task
  const handleExpand = useCallback((id: string) => {
    setExpandedTask(prev => prev === id ? null : id)
  }, [])

  // Create new task
  const handleCreateTask = useCallback(() => {
    if (!newTask.title.trim()) return

    createTask({
      title: newTask.title.trim(),
      description: newTask.description || null,
      status: 'todo',
      priority: newTask.priority,
      dueDate: newTask.dueDate || null,
      projectId: newTask.projectId || null,
      category: newTask.category || null,
      estimatedTime: newTask.estimatedTime ? parseFloat(newTask.estimatedTime) * 60 : null,
      reminderAt: newTask.reminderEnabled && newTask.reminderAt ? newTask.reminderAt : null,
    })

    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      projectId: '',
      category: '',
      estimatedTime: '',
      reminderEnabled: false,
      reminderAt: '',
    })
    setDialogOpen(false)
  }, [newTask, createTask])

  // Find the active task for drag overlay
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <div className="space-y-4">
      {/* ─── Top Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Project filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-zinc-900 border-zinc-800 text-zinc-300 text-sm">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-zinc-300 focus:text-zinc-100">
              <FolderOpen className="w-3.5 h-3.5 mr-2" />
              Tous les projets
            </SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-zinc-300 focus:text-zinc-100">
                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.color || '#10b981' }} />
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Rechercher une tâche..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 text-sm h-9"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 px-2.5 ${viewMode === 'kanban' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 px-2.5 ${viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* New task button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Nouvelle tâche</DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Créez une nouvelle tâche pour organiser votre travail.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Titre *</Label>
                  <Input
                    placeholder="Titre de la tâche"
                    value={newTask.title}
                    onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Description</Label>
                  <Textarea
                    placeholder="Description détaillée..."
                    value={newTask.description}
                    onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 min-h-[80px]"
                  />
                </div>

                {/* Priority + Due date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Priorité</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={v => setNewTask(prev => ({ ...prev, priority: v }))}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="low" className="text-zinc-300">Basse</SelectItem>
                        <SelectItem value="medium" className="text-zinc-300">Moyenne</SelectItem>
                        <SelectItem value="high" className="text-zinc-300">Élevée</SelectItem>
                        <SelectItem value="urgent" className="text-zinc-300">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Échéance</Label>
                    <Input
                      type="date"
                      value={newTask.dueDate}
                      onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="bg-zinc-900 border-zinc-800 text-zinc-300"
                    />
                  </div>
                </div>

                {/* Project + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Projet</Label>
                    <Select
                      value={newTask.projectId}
                      onValueChange={v => setNewTask(prev => ({ ...prev, projectId: v }))}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300">
                        <SelectValue placeholder="Aucun projet" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-zinc-300">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Catégorie</Label>
                    <Input
                      placeholder="Ex: Design, Dev..."
                      value={newTask.category}
                      onChange={e => setNewTask(prev => ({ ...prev, category: e.target.value }))}
                      className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* Estimated time */}
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Temps estimé (heures)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="2"
                    value={newTask.estimatedTime}
                    onChange={e => setNewTask(prev => ({ ...prev, estimatedTime: e.target.value }))}
                    className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 w-32"
                  />
                </div>

                {/* Reminder */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newTask.reminderEnabled}
                      onCheckedChange={v => setNewTask(prev => ({ ...prev, reminderEnabled: v }))}
                    />
                    <Label className="text-zinc-400 text-xs">Rappel</Label>
                  </div>
                  {newTask.reminderEnabled && (
                    <Input
                      type="datetime-local"
                      value={newTask.reminderAt}
                      onChange={e => setNewTask(prev => ({ ...prev, reminderAt: e.target.value }))}
                      className="bg-zinc-900 border-zinc-800 text-zinc-300"
                    />
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={!newTask.title.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── Kanban View ─────────────────────────────── */}
      {viewMode === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {COLUMNS.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id] || []}
                projects={projectList}
                expandedTask={expandedTask}
                onExpand={handleExpand}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <Card className="py-0 gap-0 bg-zinc-800 border-emerald-500/50 shadow-xl shadow-emerald-500/10 rotate-2 w-[280px]">
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-zinc-200 truncate">{activeTask.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] ${(PRIORITY_CONFIG[activeTask.priority] || PRIORITY_CONFIG.medium).color}`}>
                      {(PRIORITY_CONFIG[activeTask.priority] || PRIORITY_CONFIG.medium).label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ─── List View ───────────────────────────────── */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-zinc-900/60 border-zinc-800 py-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Titre</TableHead>
                  <TableHead className="text-zinc-400">Priorité</TableHead>
                  <TableHead className="text-zinc-400">Projet</TableHead>
                  <TableHead className="text-zinc-400">Échéance</TableHead>
                  <TableHead className="text-zinc-400">Statut</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-600 py-8">
                      Aucune tâche trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map(task => {
                    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                    const due = formatDueDate(task.dueDate)
                    const col = COLUMNS.find(c => c.id === task.status)
                    const proj = task.project || projects.find(p => p.id === task.projectId)

                    return (
                      <TableRow key={task.id} className="border-zinc-800/50">
                        <TableCell className="text-zinc-200 font-medium max-w-[200px]">
                          <span className="truncate block">{task.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${priority.bg} ${priority.color}`}>
                            {priority.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {proj ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: proj.color || '#10b981' }}
                              />
                              <span className="text-xs text-zinc-400">{proj.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? (
                            <span className={`text-xs ${due.className}`}>{due.text}</span>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${col?.color || 'bg-zinc-500'}`} />
                            <span className="text-xs text-zinc-400">{col?.label || task.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:text-emerald-400"
                              onClick={() => {
                                // Quick status cycle
                                const statusOrder = ['todo', 'in_progress', 'waiting_client', 'done']
                                const idx = statusOrder.indexOf(task.status)
                                const next = statusOrder[(idx + 1) % statusOrder.length]
                                updateTask(task.id, { status: next })
                              }}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:text-red-400"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
