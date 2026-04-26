'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore, type Task, type Email, type Reminder, type CalendarEvent } from '@/lib/store'
import { StatsCards } from '@/components/stats-cards'
import { getTimeUntilReminder, formatReminderDate } from '@/lib/notifications'
import { format, isToday, isPast, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Bell, Mail, CheckSquare, Clock, Star, ExternalLink } from 'lucide-react'

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

function MiniCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const { selectedDate, setSelectedDate, setActiveTab } = useAppStore()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  const eventDates = new Set(
    events
      .filter((e) => {
        const d = parseISO(e.startDate)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .map((e) => parseISO(e.startDate).getDate())
  )

  const monthName = format(currentDate, 'MMMM yyyy', { locale: fr })

  const handleDayClick = (day: number) => {
    const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd')
    setSelectedDate(dateStr)
    setActiveTab('calendar')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold capitalize">{monthName}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
            <div key={d} className="text-xs text-muted-foreground font-medium py-1">{d}</div>
          ))}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd')
            const isSelected = selectedDate === dateStr
            const isTodayDate = isToday(new Date(year, month, day))
            const hasEvents = eventDates.has(day)

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`mini-calendar-day relative ${
                  isSelected
                    ? 'mini-calendar-day-selected'
                    : isTodayDate
                    ? 'mini-calendar-day-today'
                    : ''
                }`}
              >
                {day}
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { tasks, events, reminders, emails, stats, setActiveTab } = useAppStore()
  const chartData = useMemo(() => {
    if (!stats?.dailyCompleted) return []
    return stats.dailyCompleted.map((d) => ({
      name: format(parseISO(d.date), 'EEE', { locale: fr }),
      count: d.count,
    }))
  }, [stats])

  const upcomingTasks = tasks
    .filter((t: Task) => t.status !== 'done' && t.dueDate)
    .sort((a: Task, b: Task) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5)

  const recentEmails = emails
    .filter((e: Email) => !e.isSent)
    .slice(0, 5)

  const upcomingReminders = reminders
    .filter((r: Reminder) => !r.isSent)
    .sort((a: Reminder, b: Reminder) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
    .slice(0, 5)

  const getTaskDueStatus = (task: Task) => {
    if (!task.dueDate) return ''
    const due = parseISO(task.dueDate)
    if (isPast(due) && !isToday(due)) return 'task-overdue'
    if (isToday(due)) return 'task-due-today'
    return ''
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold mb-1">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">Vue d&apos;ensemble de votre activité freelance</p>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={item}>
        <StatsCards />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Productivity chart */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Productivité de la semaine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 15%)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 155)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 155)' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'oklch(0.18 0.008 155)',
                          border: '1px solid oklch(1 0 0 / 10%)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'oklch(0.985 0.002 155)' }}
                      />
                      <Bar dataKey="count" fill="oklch(0.696 0.17 162.48)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming tasks */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Tâches à venir
                  </CardTitle>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Voir tout <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune tâche à venir</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {upcomingTasks.map((task: Task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${getTaskDueStatus(task)} task-${task.priority}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(task.dueDate), 'd MMM', { locale: fr })}
                              </span>
                            )}
                            {task.category && (
                              <span className="text-xs text-muted-foreground/60">{task.category}</span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${priorityColors[task.priority] || ''}`}
                        >
                          {priorityLabels[task.priority] || task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent emails */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-rose-500" />
                    Emails récents
                  </CardTitle>
                  <button
                    onClick={() => setActiveTab('emails')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Voir tout <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {recentEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucun email récent</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {recentEmails.map((email: Email) => (
                      <div
                        key={email.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-accent/50 cursor-pointer ${
                          !email.isRead ? 'email-item-unread' : 'email-item-read'
                        }`}
                        onClick={() => setActiveTab('emails')}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-medium text-primary">
                          {(email.fromName || email.fromAddress)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                              {email.fromName || email.fromAddress}
                            </p>
                            {email.isStarred && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                          </div>
                          <p className="text-sm truncate text-muted-foreground">{email.subject}</p>
                          {email.snippet && (
                            <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{email.snippet}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground/50 flex-shrink-0">
                          {format(parseISO(email.receivedAt), 'HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Mini calendar */}
          <motion.div variants={item}>
            <MiniCalendar events={events} />
          </motion.div>

          {/* Upcoming reminders */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4 text-violet-500" />
                    Rappels à venir
                  </CardTitle>
                  <button
                    onClick={() => setActiveTab('reminders')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Voir tout <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingReminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucun rappel à venir</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {upcomingReminders.map((reminder: Reminder) => (
                      <div
                        key={reminder.id}
                        className="p-2.5 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <p className="text-sm font-medium">{reminder.title}</p>
                        {reminder.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reminder.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-primary font-medium">
                            {getTimeUntilReminder(reminder.remindAt)}
                          </span>
                          <span className="text-xs text-muted-foreground/50">
                            {formatReminderDate(reminder.remindAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Task completion summary */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Résumé des tâches</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.taskBreakdown && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">À faire</span>
                      <span className="text-sm font-semibold">{stats.taskBreakdown.todo}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${stats.totalTasks ? (stats.taskBreakdown.todo / stats.totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">En cours</span>
                      <span className="text-sm font-semibold">{stats.taskBreakdown.inProgress}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${stats.totalTasks ? (stats.taskBreakdown.inProgress / stats.totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Terminées</span>
                      <span className="text-sm font-semibold">{stats.taskBreakdown.done}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${stats.totalTasks ? (stats.taskBreakdown.done / stats.totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
