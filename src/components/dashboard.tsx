'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare,
  TrendingUp,
  Clock,
  Mail,
  Sparkles,
  RefreshCw,
  Plus,
  Play,
  FileText,
  ArrowRight,
  AlertTriangle,
  Target,
  Calendar,
  FolderOpen,
  Bell,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore, type TabType } from '@/lib/store'
import { toast } from 'sonner'
import { MentalLoadWidget, CoachingTipCard } from '@/components/mental-load-widget'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { format, isToday, isBefore, startOfDay, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatTimeUntil(dateStr: string): string {
  const now = new Date()
  const target = new Date(dateStr)
  const mins = differenceInMinutes(target, now)
  if (mins < 0) return 'Passé'
  if (mins < 60) return `${mins} min`
  const hours = differenceInHours(target, now)
  if (hours < 24) return `${hours}h`
  const days = differenceInDays(target, now)
  return `${days}j`
}

function priorityLabel(priority: string): string {
  switch (priority) {
    case 'urgent': return 'Urgent'
    case 'high': return 'Élevée'
    case 'medium': return 'Moyenne'
    case 'low': return 'Basse'
    default: return priority
  }
}

function priorityBadgeVariant(priority: string): 'destructive' | 'secondary' | 'outline' {
  if (priority === 'urgent' || priority === 'high') return 'destructive'
  if (priority === 'medium') return 'secondary'
  return 'outline'
}

function suggestionPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'medium': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'low': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    default: return 'bg-secondary text-secondary-foreground border-border'
  }
}

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'meeting': return 'Réunion'
    case 'deadline': return 'Deadline'
    case 'block': return 'Focus'
    case 'reminder': return 'Rappel'
    default: return type
  }
}

// ─── Skeleton Loaders ───────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  accentClass: string
  bgClass: string
  trend?: string
  sublabel?: string
}

function StatCard({ label, value, icon: Icon, accentClass, bgClass, trend, sublabel }: StatCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${accentClass}`}>
                  <TrendingUp className="w-3 h-3" /> {trend}
                </p>
              )}
              {sublabel && (
                <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${accentClass}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function Dashboard() {
  const {
    stats,
    briefing,
    suggestions,
    tasks,
    events,
    reminders,
    goals,
    projects,
    fetchBriefing,
    fetchSuggestions,
    fetchStats,
    fetchTasks,
    updateTask,
    setActiveTab,
  } = useAppStore()

  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [prioritizing, setPrioritizing] = useState(false)
  const [priorityUpdates, setPriorityUpdates] = useState<Array<{ id: string; suggestedPriority: string; reason: string }>>([])

  const handleAIPrioritize = async () => {
    setPrioritizing(true)
    try {
      const res = await fetch('/api/ai/prioritize', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.updates && data.updates.length > 0) {
          setPriorityUpdates(data.updates)
          // Apply suggested priorities
          for (const update of data.updates) {
            await updateTask(update.id, { priority: update.suggestedPriority })
          }
          await fetchTasks()
          toast.success(`${data.updates.length} tâche(s) re-prioritisée(s) par l'IA`)
        } else if (data.message) {
          setPriorityUpdates([])
          toast.info(data.message)
        } else {
          toast.info('Aucun changement de priorité suggéré')
        }
      }
    } catch (e) {
      console.error('AI prioritize error:', e)
      toast.error('Erreur lors de la priorisation IA')
    }
    setPrioritizing(false)
  }

  useEffect(() => {
    fetchStats()
    fetchSuggestions()
  }, [fetchStats, fetchSuggestions])

  const handleBriefing = async () => {
    setLoadingBriefing(true)
    await fetchBriefing()
    setLoadingBriefing(false)
  }

  // ─── Derived Data ───────────────────────────────────────────────────────

  const todayStr = useMemo(() => new Date().toDateString(), [])

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done' && t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  }, [tasks])

  const todayEvents = useMemo(() => {
    return events
      .filter(e => isToday(new Date(e.startDate)))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [events, todayStr])

  const upcomingReminders = useMemo(() => {
    return reminders
      .filter(r => !r.isSent)
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
      .slice(0, 3)
  }, [reminders])

  const weekChartData = useMemo(() => {
    if (stats?.weekDays && stats.weekDays.length > 0) {
      return stats.weekDays.map(d => ({
        name: d.day,
        heures: Number(d.totalHours.toFixed(1)),
      }))
    }
    // Fallback mock data
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    return days.map(d => ({ name: d, heures: 0 }))
  }, [stats])

  // ─── Date display ──────────────────────────────────────────────────────

  const formattedDate = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  // ─── Stats values ──────────────────────────────────────────────────────

  const isLoadingStats = !stats

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ═══ 1. Greeting + Briefing ═════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-500/10 to-amber-500/5 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {getGreeting()}, <span className="text-emerald-400">Alex</span> 👋
                </h1>
                <p className="text-muted-foreground mt-1">{capitalizedDate}</p>
              </div>
              <Button
                onClick={handleBriefing}
                disabled={loadingBriefing}
                className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 flex-shrink-0"
                variant="outline"
              >
                {loadingBriefing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {briefing ? 'Rafraîchir le briefing' : 'Générer mon briefing'}
              </Button>
            </div>

            <AnimatePresence>
              {briefing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 rounded-lg border-l-4 border-l-emerald-400 bg-background/50 border border-border"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{briefing}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ 2. Stats Cards Row ═════════════════════════════════════════════ */}
      {isLoadingStats ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tâches aujourd'hui"
            value={stats?.tasksToday || 0}
            icon={CheckSquare}
            accentClass="text-emerald-400"
            bgClass="bg-emerald-500/10"
            sublabel={stats ? `${stats.completedTasksThisWeek} terminées cette semaine` : undefined}
          />
          <StatCard
            label="CA du mois"
            value={`${(stats?.monthlyRevenue || 0).toLocaleString('fr-FR')} €`}
            icon={TrendingUp}
            accentClass="text-amber-400"
            bgClass="bg-amber-500/10"
            trend="+12%"
          />
          <StatCard
            label="Heures cette semaine"
            value={stats?.weeklyHours || 0}
            icon={Clock}
            accentClass="text-zinc-400"
            bgClass="bg-zinc-500/10"
            sublabel={stats ? `${stats.billableHours}h facturées` : undefined}
          />
          <StatCard
            label="Emails non lus"
            value={stats?.unreadEmails || 0}
            icon={Mail}
            accentClass="text-rose-400"
            bgClass="bg-rose-500/10"
            trend={stats && stats.unreadEmails > 5 ? 'Attention' : undefined}
          />
        </div>
      )}

      {/* ═══ 3. AI Suggestions ══════════════════════════════════════════════ */}
      {suggestions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Suggestions de Maellis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{s.title}</p>
                      <Badge
                        className={`text-[10px] border ${suggestionPriorityColor(s.priority)}`}
                        variant="outline"
                      >
                        {s.priority === 'high' ? 'Élevée' : s.priority === 'medium' ? 'Moyenne' : 'Basse'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 text-xs text-emerald-400 hover:text-emerald-300"
                    onClick={() => {
                      const tab = s.actionUrl?.replace('#', '') as TabType
                      if (tab) setActiveTab(tab)
                    }}
                  >
                    Voir les détails
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══ 4. Two-Column Layout ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ─── Left Column (60%) ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Productivity Chart */}
          {isLoadingStats ? (
            <ChartSkeleton />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Productivité cette semaine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weekChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        stroke="var(--muted-foreground)"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="var(--muted-foreground)"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'var(--foreground)' }}
                        formatter={(value: number) => [`${value}h`, 'Heures']}
                      />
                      <Area
                        type="monotone"
                        dataKey="heures"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#emeraldGradient)"
                        name="Heures"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Upcoming Tasks */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                    Tâches à venir
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={handleAIPrioritize}
                      disabled={prioritizing}
                    >
                      {prioritizing ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                      {prioritizing ? 'Analyse...' : 'Prioriser avec l\'IA'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                      onClick={() => setActiveTab('tasks')}
                    >
                      Voir tout <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map((task) => {
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null
                    const isOverdue = dueDate && isBefore(dueDate, startOfDay(new Date())) && task.status !== 'done'
                    const isDueToday = dueDate && isToday(dueDate)

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => setActiveTab('tasks')}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              variant={priorityBadgeVariant(task.priority)}
                              className="text-[10px] h-5"
                            >
                              {priorityLabel(task.priority)}
                            </Badge>
                            {task.project && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5"
                                style={{ borderColor: task.project.color, color: task.project.color }}
                              >
                                {task.project.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {task.dueDate && (
                          <span
                            className={`text-xs whitespace-nowrap ${
                              isOverdue
                                ? 'text-red-400 font-medium'
                                : isDueToday
                                  ? 'text-amber-400 font-medium'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            {format(new Date(task.dueDate), 'd MMM', { locale: fr })}
                          </span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune tâche à venir
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ─── Right Column (40%) ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Mental Load Widget */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <MentalLoadWidget />
          </motion.div>

          {/* Coaching Tip */}
          <CoachingTipCard />

          {/* Today's Events — Mini Timeline */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Événements aujourd&apos;hui
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                    onClick={() => setActiveTab('calendar')}
                  >
                    Voir le calendrier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todayEvents.length > 0 ? (
                  <div className="relative space-y-0">
                    {/* Timeline line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                    {todayEvents.map((event) => (
                      <div key={event.id} className="flex items-start gap-3 py-2 relative">
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2 border-background flex-shrink-0 mt-0.5 z-10"
                          style={{ backgroundColor: event.color || '#10b981' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{event.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.allDay
                              ? 'Toute la journée'
                              : format(new Date(event.startDate), 'HH:mm', { locale: fr })}
                            {event.location && (
                              <span> · {event.location}</span>
                            )}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">
                          {eventTypeLabel(event.type)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucun événement aujourd&apos;hui
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Goals — Progress Bars */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  Objectifs de la semaine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {goals.length > 0 ? (
                  goals.map((goal) => {
                    const progress = goal.target ? Math.min((goal.current / goal.target) * 100, 100) : 0
                    const unitLabel = goal.unit === 'tasks' ? 'tâches' : goal.unit === 'hours' ? 'h' : '€'
                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{goal.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {goal.current}{goal.target ? `/${goal.target}` : ''} {unitLabel}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-emerald-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">Aucun objectif défini</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                      onClick={() => setActiveTab('settings')}
                    >
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      Définir un objectif
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Reminders */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Rappels à venir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {upcomingReminders.length > 0 ? (
                  upcomingReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{reminder.title}</p>
                        {reminder.message && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{reminder.message}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        dans {formatTimeUntil(reminder.remindAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun rappel à venir
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ═══ 5. Quick Actions Bar ═══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap gap-3"
      >
        <Button
          onClick={() => setActiveTab('tasks')}
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
        </Button>
        <Button
          onClick={() => setActiveTab('documents')}
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <FolderOpen className="w-4 h-4 mr-2" /> Nouveau projet
        </Button>
        <Button
          onClick={() => setActiveTab('invoices')}
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <FileText className="w-4 h-4 mr-2" /> Nouvelle facture
        </Button>
        <Button
          onClick={() => setActiveTab('time')}
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <Play className="w-4 h-4 mr-2" /> Démarrer chrono
        </Button>
      </motion.div>
    </div>
  )
}
