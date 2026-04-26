'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTask?: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
    category: string | null
  } | null
}

export function TaskForm({ open, onOpenChange, editTask }: TaskFormProps) {
  const { createTask, updateTask } = useAppStore()
  const [title, setTitle] = useState(editTask?.title || '')
  const [description, setDescription] = useState(editTask?.description || '')
  const [priority, setPriority] = useState(editTask?.priority || 'medium')
  const [dueDate, setDueDate] = useState(
    editTask?.dueDate ? new Date(editTask.dueDate).toISOString().slice(0, 16) : ''
  )
  const [category, setCategory] = useState(editTask?.category || '')
  const [status, setStatus] = useState(editTask?.status || 'todo')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (editTask) {
      await updateTask(editTask.id, {
        title,
        description: description || null,
        priority,
        dueDate: dueDate || null,
        category: category || null,
        status,
      })
    } else {
      await createTask({
        title,
        description: description || null,
        priority,
        dueDate: dueDate || null,
        category: category || null,
        status,
      })
    }

    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setCategory('')
    setStatus('todo')
  }

  // Reset form when dialog opens with new editTask
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && editTask) {
      setTitle(editTask.title)
      setDescription(editTask.description || '')
      setPriority(editTask.priority)
      setDueDate(editTask.dueDate ? new Date(editTask.dueDate).toISOString().slice(0, 16) : '')
      setCategory(editTask.category || '')
      setStatus(editTask.status)
    } else if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnel)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">À faire</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="done">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Date limite</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Développement">Développement</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="DevOps">DevOps</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editTask ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
