'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, LayoutGrid, List, GripVertical, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useAppStore, Task, Project } from '@/lib/store'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  todo: { label: 'À faire', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  in_progress: { label: 'En cours', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  waiting_client: { label: 'En attente client', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  done: { label: 'Terminé', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { label: 'Élevée', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  medium: { label: 'Moyenne', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  low: { label: 'Basse', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

function TaskCard({ task, onStatusChange, onDelete }: { task: Task; onStatusChange: (id: string, status: string) => void; onDelete: (id: string) => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-emerald-500/30 transition-all',
        isOverdue && 'border-red-500/30 bg-red-500/5',
        isDueToday && !isOverdue && 'border-amber-500/30'
      )}
      onClick={() => onStatusChange(task.id, task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : task.status === 'done' ? 'todo' : 'in_progress')}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through text-muted-foreground')}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge className={cn('text-[10px] h-4', priorityConfig[task.priority]?.color || 'bg-slate-500/20 text-slate-400')}>
          {priorityConfig[task.priority]?.label || task.priority}
        </Badge>

        {task.project && (
          <Badge variant="outline" className="text-[10px] h-4" style={{ borderColor: task.project.color, color: task.project.color }}>
            {task.project.name}
          </Badge>
        )}

        {task.dueDate && (
          <span className={cn('text-[10px] flex items-center gap-1', isOverdue ? 'text-red-400' : 'text-muted-foreground')}>
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}

        {task.estimatedTime && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {Math.floor(task.estimatedTime / 60)}h{task.estimatedTime % 60 > 0 ? `${task.estimatedTime % 60}` : ''}
          </span>
        )}
      </div>

      {task.estimatedTime && task.actualTime && (
        <div className="mt-2">
          <Progress value={Math.min((task.actualTime / task.estimatedTime) * 100, 100)} className="h-1" />
        </div>
      )}
    </motion.div>
  )
}

function TaskForm({ projects, onSubmit }: { projects: Project[]; onSubmit: (data: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')

  const handleSubmit = () => {
    if (!title.trim()) return
    onSubmit({
      title,
      description: description || null,
      priority,
      dueDate: dueDate || null,
      projectId: projectId || null,
      category: category || null,
      estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
    })
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setProjectId('')
    setCategory('')
    setEstimatedTime('')
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la tâche" className="bg-secondary" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." className="bg-secondary" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Priorité</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Basse</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Élevée</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Échéance</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-secondary" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Projet</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="bg-secondary"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dev">Développement</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="meeting">Réunion</SelectItem>
              <SelectItem value="docs">Documentation</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="devops">DevOps</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Temps estimé (minutes)</Label>
        <Input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="60" className="bg-secondary" />
      </div>
      <Button onClick={handleSubmit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
        <Plus className="w-4 h-4 mr-2" /> Créer la tâche
      </Button>
    </div>
  )
}

export function TaskBoard() {
  const { tasks, projects, createTask, updateTask, deleteTask } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
      const matchProject = filterProject === 'all' || t.projectId === filterProject
      return matchSearch && matchProject
    })
  }, [tasks, search, filterProject])

  const columns = ['todo', 'in_progress', 'waiting_client', 'done']

  const handleStatusChange = async (id: string, status: string) => {
    await updateTask(id, { status })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold">Tâches & Projets</h2>
          <p className="text-sm text-muted-foreground">{filteredTasks.length} tâche(s)</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
            </DialogHeader>
            <TaskForm projects={projects} onSubmit={(data) => createTask(data as Partial<Task>)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="pl-9 bg-secondary"
          />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-[200px] bg-secondary">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-lg p-1 bg-secondary">
          <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className={viewMode === 'kanban' ? 'bg-emerald-500/20 text-emerald-400' : ''}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : ''}>
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((status) => {
            const config = statusConfig[status]
            const columnTasks = filteredTasks.filter(t => t.status === status)
            return (
              <div key={status} className="space-y-2">
                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', config.bgColor)}>
                  <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-4">{columnTasks.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  <AnimatePresence>
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={deleteTask}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
                return (
                  <div key={task.id} className={cn('flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors', isOverdue && 'bg-red-500/5')}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusConfig[task.status]?.color?.replace('text-', '').includes('amber') ? '#f59e0b' : task.status === 'done' ? '#10b981' : task.status === 'waiting_client' ? '#f97316' : '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>{task.title}</p>
                    </div>
                    <Badge className={cn('text-[10px] h-4', priorityConfig[task.priority]?.color)}>
                      {priorityConfig[task.priority]?.label}
                    </Badge>
                    {task.project && (
                      <Badge variant="outline" className="text-[10px] h-4" style={{ borderColor: task.project.color, color: task.project.color }}>
                        {task.project.name}
                      </Badge>
                    )}
                    {task.dueDate && (
                      <span className={cn('text-xs', isOverdue ? 'text-red-400' : 'text-muted-foreground')}>
                        {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] h-4">
                      {statusConfig[task.status]?.label}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => deleteTask(task.id)}>
                      ✕
                    </Button>
                  </div>
                )
              })}
              {filteredTasks.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Aucune tâche trouvée</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Sidebar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Projets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {projects.map(project => {
              const projectTasks = tasks.filter(t => t.projectId === project.id)
              const doneTasks = projectTasks.filter(t => t.status === 'done').length
              return (
                <div key={project.id} className="p-3 rounded-lg bg-secondary/50 border border-border hover:border-emerald-500/30 cursor-pointer transition-colors" onClick={() => setFilterProject(project.id)}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{project.clientName}</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{doneTasks}/{projectTasks.length} tâches</span>
                      <Badge variant={project.status === 'active' ? 'default' : project.status === 'on_hold' ? 'secondary' : 'outline'} className="text-[10px] h-4">
                        {project.status === 'active' ? 'Actif' : project.status === 'on_hold' ? 'En pause' : project.status === 'completed' ? 'Terminé' : 'Archivé'}
                      </Badge>
                    </div>
                    <Progress value={projectTasks.length > 0 ? (doneTasks / projectTasks.length) * 100 : 0} className="h-1" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
