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

interface ReminderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReminderForm({ open, onOpenChange }: ReminderFormProps) {
  const { createReminder } = useAppStore()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [type, setType] = useState('notification')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !remindAt) return

    await createReminder({
      title,
      message: message || null,
      remindAt,
      type,
    })

    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setRemindAt('')
    setType('notification')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau rappel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Titre</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du rappel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-message">Message</Label>
            <Textarea
              id="reminder-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message (optionnel)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-date">Date et heure</Label>
            <Input
              id="reminder-date"
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notification">Notification visuelle</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
