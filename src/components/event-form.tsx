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
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/lib/store'

const colorOptions = [
  { value: '#10b981', label: 'Émeraude' },
  { value: '#f59e0b', label: 'Ambre' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#f97316', label: 'Orange' },
  { value: '#3b82f6', label: 'Bleu' },
]

interface EventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
}

export function EventForm({ open, onOpenChange, defaultDate }: EventFormProps) {
  const { createEvent } = useAppStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(
    defaultDate ? `${defaultDate}T09:00` : new Date().toISOString().slice(0, 16)
  )
  const [endDate, setEndDate] = useState(
    defaultDate ? `${defaultDate}T10:00` : ''
  )
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState('#10b981')
  const [location, setLocation] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await createEvent({
      title,
      description: description || null,
      startDate,
      endDate: allDay ? null : endDate || null,
      allDay,
      color,
      location: location || null,
    })

    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStartDate(new Date().toISOString().slice(0, 16))
    setEndDate('')
    setAllDay(false)
    setColor('#10b981')
    setLocation('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Titre</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'événement"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-desc">Description</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnel)"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={allDay}
              onCheckedChange={setAllDay}
            />
            <Label>Journée entière</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Début</Label>
              <Input
                id="start-date"
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? startDate.slice(0, 10) : startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="end-date">Fin</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Lieu</Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lieu (optionnel)"
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === option.value ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : ''
                  }`}
                  style={{ backgroundColor: option.value, '--tw-ring-color': option.value } as React.CSSProperties}
                  title={option.label}
                />
              ))}
            </div>
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
