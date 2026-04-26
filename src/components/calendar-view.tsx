'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore, type CalendarEvent } from '@/lib/store'
import { EventForm } from '@/components/event-form'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameMonth, parseISO, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

type ViewMode = 'month' | 'week'

export function CalendarView() {
  const { events, selectedDate, setSelectedDate, deleteEvent } = useAppStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = (getDay(monthStart) + 6) % 7 // Monday-based

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach((event) => {
      const dateKey = format(parseISO(event.startDate), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(event)
    })
    return map
  }, [events])

  const monthName = format(currentMonth, 'MMMM yyyy', { locale: fr })
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const selectedDayEvents = selectedDay
    ? events.filter((e) => isSameDay(parseISO(e.startDate), selectedDay))
    : []

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    setSelectedDate(format(day, 'yyyy-MM-dd'))
  }

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id)
    toast.success('Événement supprimé')
  }

  // Week view hours
  const hours = Array.from({ length: 13 }, (_, i) => i + 7) // 7am to 7pm
  const weekStart = (() => {
    const d = selectedDay || new Date()
    const dayOfWeek = (getDay(d) + 6) % 7
    const start = new Date(d)
    start.setDate(start.getDate() - dayOfWeek)
    return start
  })()
  const weekDaysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground text-sm">Planifiez vos événements et rendez-vous</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="text-xs h-7"
            >
              Mois
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="text-xs h-7"
            >
              Semaine
            </Button>
          </div>
          <Button onClick={() => setShowEventForm(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Événement
          </Button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Month View */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg capitalize">{monthName}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="calendar-month-grid">
                  {weekDays.map((day) => (
                    <div key={day} className="calendar-month-header">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: startPad }).map((_, i) => (
                    <div key={`pad-${i}`} className="calendar-month-cell bg-muted/30" />
                  ))}
                  {daysInMonth.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayEvents = eventsByDate[dateKey] || []
                    const isSelected = selectedDay && isSameDay(day, selectedDay)
                    const isCurrentMonth = isSameMonth(day, currentMonth)

                    return (
                      <div
                        key={dateKey}
                        onClick={() => handleDayClick(day)}
                        className={`calendar-month-cell cursor-pointer hover:bg-accent/50 transition-colors ${
                          isSelected ? 'ring-2 ring-primary ring-inset' : ''
                        } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between px-1">
                          <span
                            className={`text-xs font-medium ${
                              isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
                            }`}
                          >
                            {format(day, 'd')}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary notification-pulse" />
                          )}
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className="calendar-event-block text-white"
                              style={{ backgroundColor: event.color }}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground pl-1">
                              +{dayEvents.length - 3} autres
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Day Detail Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {selectedDay
                    ? format(selectedDay, 'EEEE d MMMM', { locale: fr })
                    : 'Sélectionnez un jour'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDay ? (
                  selectedDayEvents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDayEvents.map((event) => (
                        <div key={event.id} className="p-3 rounded-lg border space-y-1.5">
                          <div className="flex items-start gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: event.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{event.title}</p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="p-1 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.allDay
                                ? 'Journée entière'
                                : `${format(parseISO(event.startDate), 'HH:mm')}${
                                    event.endDate ? ` - ${format(parseISO(event.endDate), 'HH:mm')}` : ''
                                  }`}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun événement ce jour
                    </p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Cliquez sur un jour pour voir les détails
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Prochains événements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {events
                    .filter((e) => new Date(e.startDate) >= new Date())
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .slice(0, 5)
                    .map((event) => (
                      <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.startDate), 'd MMM HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Week View */
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Semaine du {format(weekStart, 'd MMMM', { locale: fr })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[700px]">
                {/* Week header */}
                <div className="week-time-grid">
                  <div /> {/* Empty corner */}
                  {weekDaysList.map((day, i) => (
                    <div
                      key={i}
                      className={`text-center p-2 border-b ${
                        isToday(day) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">
                        {format(day, 'EEE', { locale: fr })}
                      </div>
                      <div className={`text-sm font-semibold ${isToday(day) ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Time slots */}
                {hours.map((hour) => (
                  <div key={hour} className="week-time-grid">
                    <div className="week-time-label border-b border-border/50 h-12">
                      {`${hour}:00`}
                    </div>
                    {weekDaysList.map((day, dayIdx) => {
                      const dateKey = format(day, 'yyyy-MM-dd')
                      const dayEvents = eventsByDate[dateKey] || []
                      const hourEvents = dayEvents.filter((e) => {
                        const eDate = parseISO(e.startDate)
                        return eDate.getHours() === hour
                      })

                      return (
                        <div
                          key={dayIdx}
                          className="border-b border-border/50 h-12 p-0.5 relative hover:bg-accent/30 cursor-pointer"
                          onClick={() => {
                            setSelectedDate(format(day, 'yyyy-MM-dd'))
                            handleDayClick(day)
                          }}
                        >
                          {hourEvents.map((event) => (
                            <div
                              key={event.id}
                              className="absolute inset-x-0.5 rounded text-white text-xs px-1 py-0.5 truncate"
                              style={{ backgroundColor: event.color }}
                            >
                              {event.title}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <EventForm
        open={showEventForm}
        onOpenChange={setShowEventForm}
        defaultDate={selectedDate}
      />
    </motion.div>
  )
}
