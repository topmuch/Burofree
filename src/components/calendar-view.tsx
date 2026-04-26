'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAppStore, CalendarEvent } from '@/lib/store'
import { cn } from '@/lib/utils'
import { CalendarSyncButton } from '@/components/calendar-sync-button'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const eventTypeLabels: Record<string, string> = { meeting: 'Réunion', deadline: 'Deadline', block: 'Créneau Focus', reminder: 'Rappel' }

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []
  
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6
  
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  
  return days
}

function EventForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [color, setColor] = useState('#10b981')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [type, setType] = useState('meeting')

  const handleSubmit = () => {
    if (!title || !startDate) return
    onSubmit({
      title,
      description: description || null,
      startDate: allDay ? new Date(startDate).toISOString() : new Date(`${startDate}T${startTime}`).toISOString(),
      endDate: allDay ? null : (endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null),
      color,
      allDay,
      location: location || null,
      type,
    })
    setTitle('')
    setDescription('')
    setStartDate('')
    setStartTime('09:00')
    setEndDate('')
    setEndTime('10:00')
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'événement" className="bg-secondary" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." className="bg-secondary" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date début *</Label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }} className="bg-secondary" />
        </div>
        {!allDay && (
          <div>
            <Label>Heure début</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-secondary" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={allDay} onCheckedChange={setAllDay} />
        <Label>Toute la journée</Label>
      </div>
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date fin</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-secondary" />
          </div>
          <div>
            <Label>Heure fin</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-secondary" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting">Réunion</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="block">Créneau Focus</SelectItem>
              <SelectItem value="reminder">Rappel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Couleur</Label>
          <div className="flex gap-2 mt-1">
            {['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'].map(c => (
              <button key={c} className={cn('w-6 h-6 rounded-full border-2', color === c ? 'border-white' : 'border-transparent')} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
      </div>
      <div>
        <Label>Lieu</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu ou lien..." className="bg-secondary" />
      </div>
      <Button onClick={handleSubmit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
        <Plus className="w-4 h-4 mr-2" /> Créer l&apos;événement
      </Button>
    </div>
  )
}

export function CalendarView() {
  const { events, createEvent, deleteEvent, tasks } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const days = useMemo(() => getMonthDays(year, month), [year, month])

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date()) }

  const getEventsForDay = (date: Date) => {
    return events.filter(e => new Date(e.startDate).toDateString() === date.toDateString())
  }

  const getTasksForDay = (date: Date) => {
    return tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === date.toDateString())
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []
  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : []

  // Check for conflicting events
  const hasConflict = (dayEvents: CalendarEvent[]) => {
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const a = dayEvents[i], b = dayEvents[j]
        if (!a.allDay && !b.allDay && a.endDate && b.endDate) {
          const aStart = new Date(a.startDate).getTime()
          const aEnd = new Date(a.endDate).getTime()
          const bStart = new Date(b.startDate).getTime()
          const bEnd = new Date(b.endDate).getTime()
          if (aStart < bEnd && bStart < aEnd) return true
        }
      }
    }
    return false
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Calendrier</h2>
          <p className="text-sm text-muted-foreground">{events.length} événement(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarSyncButton />
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="w-4 h-4 mr-2" /> Nouvel événement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvel événement</DialogTitle>
              </DialogHeader>
              <EventForm onSubmit={(data) => createEvent(data as Partial<CalendarEvent>)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{MONTHS_FR[month]} {year}</h3>
                  <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">Aujourd&apos;hui</Button>
                </div>
                <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>

              {/* Calendar Grid */}
              <div className="calendar-month-grid">
                {DAYS_FR.map(day => (
                  <div key={day} className="calendar-month-header">{day}</div>
                ))}
                {days.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} className="calendar-month-cell opacity-30" />
                  
                  const dayEvents = getEventsForDay(date)
                  const dayTasks = getTasksForDay(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isSelected = selectedDay?.toDateString() === date.toDateString()
                  const conflictDetected = hasConflict(dayEvents)

                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        'calendar-month-cell cursor-pointer transition-colors',
                        isToday && 'bg-emerald-500/10',
                        isSelected && 'ring-1 ring-emerald-500/50',
                      )}
                      onClick={() => setSelectedDay(date)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs', isToday && 'text-emerald-400 font-bold')}>
                          {date.getDate()}
                        </span>
                        {conflictDetected && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className="calendar-event-block text-white"
                            style={{ backgroundColor: event.color + '99' }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayTasks.slice(0, 2).map(task => (
                          <div key={task.id} className="calendar-event-block bg-amber-500/30 text-amber-300">
                            📋 {task.title}
                          </div>
                        ))}
                        {(dayEvents.length + dayTasks.length > 3) && (
                          <span className="text-[10px] text-muted-foreground">+{dayEvents.length + dayTasks.length - 3} de plus</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Selected Day */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {selectedDay ? selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sélectionnez un jour'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map(event => {
                    const conflict = hasConflict(selectedDayEvents)
                    return (
                      <div key={event.id} className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{event.title}</p>
                              {conflict && <AlertTriangle className="w-3 h-3 text-red-400" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.allDay ? 'Toute la journée' : new Date(event.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              {event.endDate && !event.allDay && ` - ${new Date(event.endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> {event.location}
                              </p>
                            )}
                            <Badge variant="outline" className="text-[10px] h-4 mt-1">
                              {eventTypeLabels[event.type] || event.type}
                            </Badge>
                            {event.source === 'google' && (
                              <Badge variant="outline" className="text-[10px] h-4 mt-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                Google
                              </Badge>
                            )}
                            {event.source === 'outlook' && (
                              <Badge variant="outline" className="text-[10px] h-4 mt-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                Outlook
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-red-400" onClick={() => deleteEvent(event.id)}>✕</Button>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <p className="text-sm text-muted-foreground">Aucun événement</p>
              )}
            </CardContent>
          </Card>

          {/* Tasks for selected day */}
          {selectedDayTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Tâches dues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedDayTasks.map(task => (
                  <div key={task.id} className="p-2 rounded bg-secondary/50 text-sm">
                    <span className={task.status === 'done' ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Prochains événements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {events
                .filter(e => new Date(e.startDate) >= new Date())
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(0, 8)
                .map(event => (
                  <div key={event.id} className="flex items-center gap-2 p-2 rounded bg-secondary/50 text-sm">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
