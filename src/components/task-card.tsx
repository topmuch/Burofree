'use client'

import { Badge } from '@/components/ui/badge'
import type { Task } from '@/lib/store'
import { format, parseISO, isToday, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, GripVertical, Trash2 } from 'lucide-react'

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-primary/10 text-primary border-primary/20',
}

const priorityLabels: Record<string, string> = {
  urgent: 'Urgent',
  high: 'Élevée',
  medium: 'Moyenne',
  low: 'Basse',
}

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
}

export function TaskCard({ task, onEdit, onDelete, isDragging, dragHandleProps }: TaskCardProps) {
  const dueStatus = (() => {
    if (!task.dueDate || task.status === 'done') return ''
    const due = parseISO(task.dueDate)
    if (isPast(due) && !isToday(due)) return 'task-overdue'
    if (isToday(due)) return 'task-due-today'
    return ''
  })()

  return (
    <div
      className={`group p-3 rounded-lg border bg-card hover:bg-accent/30 transition-all cursor-pointer card-hover task-${task.priority} ${dueStatus} ${
        isDragging ? 'drag-overlay' : ''
      }`}
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="mt-0.5 opacity-0 group-hover:opacity-50 cursor-grab">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority] || ''}`}>
              {priorityLabels[task.priority] || task.priority}
            </Badge>
            {task.category && (
              <Badge variant="secondary" className="text-xs">
                {task.category}
              </Badge>
            )}
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1.5 mt-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span
                className={`text-xs ${
                  dueStatus === 'task-overdue'
                    ? 'text-red-500 font-medium'
                    : dueStatus === 'task-due-today'
                    ? 'text-amber-500 font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {format(parseISO(task.dueDate), 'd MMM yyyy', { locale: fr })}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(task.id)
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
