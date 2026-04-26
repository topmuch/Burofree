'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore, type Task } from '@/lib/store'
import { TaskCard } from '@/components/task-card'
import { TaskForm } from '@/components/task-form'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const columns = [
  { id: 'todo', title: 'À faire', color: 'bg-amber-500' },
  { id: 'in_progress', title: 'En cours', color: 'bg-primary' },
  { id: 'done', title: 'Terminé', color: 'bg-emerald-600' },
]

export function TaskBoard() {
  const { tasks, updateTask, deleteTask } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const categories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [tasks, filterPriority, filterCategory, searchQuery])

  const getColumnTasks = (status: string) => {
    return filteredTasks.filter((t) => t.status === status)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Could add visual feedback here
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    // Determine target column
    let targetStatus = activeTask.status
    const overId = over.id as string

    // Check if dropped on a column
    if (['todo', 'in_progress', 'done'].includes(overId)) {
      targetStatus = overId
    } else {
      // Dropped on another task - get that task's column
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) {
        targetStatus = overTask.status
      }
    }

    if (activeTask.status !== targetStatus) {
      updateTask(activeTask.id, { status: targetStatus })
      const statusLabels: Record<string, string> = {
        todo: 'À faire',
        in_progress: 'En cours',
        done: 'Terminé',
      }
      toast.success(`Tâche déplacée vers "${statusLabels[targetStatus]}"`)
    }
  }

  const handleEditTask = (task: Task) => {
    setEditTask(task)
    setShowForm(true)
  }

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id)
    toast.success('Tâche supprimée')
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tâches</h1>
          <p className="text-muted-foreground text-sm">Gérez vos tâches avec le tableau Kanban</p>
        </div>
        <Button onClick={() => { setEditTask(null); setShowForm(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtres :
        </div>
        <Input
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-48 h-8 text-sm"
        />
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Élevée</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((column) => {
            const columnTasks = getColumnTasks(column.id)
            return (
              <div
                key={column.id}
                id={column.id}
                className="kanban-column rounded-xl border bg-muted/30 p-3 min-h-[400px]"
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {columnTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Aucune tâche
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskForm
        open={showForm}
        onOpenChange={setShowForm}
        editTask={editTask}
      />
    </motion.div>
  )
}
