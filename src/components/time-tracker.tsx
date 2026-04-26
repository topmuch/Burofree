'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore, type TimeEntry } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Play,
  Pause,
  Square,
  Plus,
  Clock,
  Timer,
  DollarSign,
  TrendingUp,
  CalendarDays,
  FileText,
  Target,
  Coffee,
  Zap,
  AlertTriangle,
  Settings2,
  BarChart3,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  format,
  isToday,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  differenceInSeconds,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

// ─── Helpers ─────────────────────────────────────────────────
function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

function formatTimeRange(start: string, end: string | null): string {
  try {
    const s = format(parseISO(start), 'HH:mm')
    const e = end ? format(parseISO(end), 'HH:mm') : '…'
    return `${s} — ${e}`
  } catch {
    return ''
  }
}

// ─── Custom Bar Chart Tooltip ────────────
function CustomBarTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-xs">
        <p className="text-zinc-300 font-medium">{label}</p>
        <p className="text-emerald-400">{payload[0].value}h</p>
      </div>
    )
  }
  return null
}

// ─── Main TimeTracker Component ──────────────────────────────
export function TimeTracker() {
  const {
    timeEntries,
    tasks,
    projects,
    activeTimer,
    startTimer,
    stopTimer,
    createTimeEntry,
    goals,
    stats,
    timeGoals,
    breakSuggestion,
    fetchTimeGoals,
    fetchBreakSuggestion,
    setBillingGoal,
    fetchTimeEntries,
    fetchStats,
  } = useAppStore()

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Timer form
  const [timerTaskId, setTimerTaskId] = useState<string>('')
  const [timerProjectId, setTimerProjectId] = useState<string>('')
  const [timerDescription, setTimerDescription] = useState('')
  const [timerBillable, setTimerBillable] = useState(true)

  // Goal settings dialog
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalForm, setGoalForm] = useState({
    targetHours: '35',
    hourlyRate: '50',
    targetRevenue: '1750',
  })

  // Reports view toggle
  const [showReports, setShowReports] = useState(false)

  // Manual entry dialog
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [manualEntry, setManualEntry] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    taskId: '',
    projectId: '',
    description: '',
    isBillable: false,
  })

  // Fetch time goals and break suggestion on mount
  useEffect(() => {
    fetchTimeGoals()
    fetchBreakSuggestion()
  }, [fetchTimeGoals, fetchBreakSuggestion])

  // Refresh goals when time entries change
  useEffect(() => {
    fetchTimeGoals()
    fetchBreakSuggestion()
  }, [timeEntries, fetchTimeGoals, fetchBreakSuggestion])

  // Derive goal form defaults from timeGoals (no setState in effect)
  const goalFormDefaults = useMemo(() => ({
    targetHours: String(timeGoals?.targetHours || 35),
    hourlyRate: String(timeGoals?.hourlyRate || 50),
    targetRevenue: String(timeGoals?.targetRevenue || 1750),
  }), [timeGoals])

  // Reset goal form when dialog opens
  const handleGoalDialogOpen = useCallback((open: boolean) => {
    if (open) {
      setGoalForm(goalFormDefaults)
    }
    setGoalDialogOpen(open)
  }, [goalFormDefaults])

  // Periodic break check (every 5 min)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBreakSuggestion()
    }, 300000)
    return () => clearInterval(interval)
  }, [fetchBreakSuggestion])

  // Tick timer
  useEffect(() => {
    if (!activeTimer || isPaused) {
      return
    }

    const start = parseISO(activeTimer.startTime)
    const tick = () => {
      const diff = differenceInSeconds(new Date(), start)
      setTimerSeconds(Math.max(0, diff))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeTimer, isPaused])

  // Derive timer form values from activeTimer when a timer is running
  const effectiveTaskId = activeTimer ? (activeTimer.taskId || '') : timerTaskId
  const effectiveProjectId = activeTimer ? (activeTimer.projectId || '') : timerProjectId
  const effectiveDescription = activeTimer ? (activeTimer.description || '') : timerDescription
  const effectiveBillable = activeTimer ? activeTimer.isBillable : timerBillable

  // Today's entries
  const todayEntries = useMemo(() => {
    return timeEntries
      .filter(e => e.startTime && isToday(parseISO(e.startTime)))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [timeEntries])

  // Today's summary
  const todaySummary = useMemo(() => {
    const totalMinutes = todayEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
    const billableMinutes = todayEntries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)
    const hourlyRate = timeGoals?.hourlyRate || 0
    return {
      totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      billableHours: Math.round(billableMinutes / 60 * 100) / 100,
      revenue: Math.round(billableMinutes / 60 * hourlyRate * 100) / 100,
    }
  }, [todayEntries, timeGoals])

  // Week entries & stats
  const weekData = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const weekEntries = timeEntries.filter(e => {
      try {
        const d = parseISO(e.startTime)
        return isWithinInterval(d, { start: weekStart, end: weekEnd })
      } catch {
        return false
      }
    })

    const totalMinutes = weekEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
    const billableMinutes = weekEntries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)
    const nonBillableMinutes = totalMinutes - billableMinutes

    // Daily breakdown
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + i)
      const dayStr = format(day, 'yyyy-MM-dd')

      const dayEntries = weekEntries.filter(e => {
        try {
          return format(parseISO(e.startTime), 'yyyy-MM-dd') === dayStr
        } catch {
          return false
        }
      })

      const dayMinutes = dayEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
      return {
        name: dayNames[i],
        heures: Math.round(dayMinutes / 60 * 10) / 10,
      }
    })

    return {
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      billableHours: Math.round(billableMinutes / 60 * 10) / 10,
      nonBillableHours: Math.round(nonBillableMinutes / 60 * 10) / 10,
      billableData: [
        { name: 'Facturable', value: billableMinutes || 0 },
        { name: 'Non facturable', value: nonBillableMinutes || 0 },
      ],
      dailyData,
    }
  }, [timeEntries])

  // Billing goals
  const billingGoals = useMemo(() => {
    return goals.filter(g => g.unit === 'hours' || g.unit === 'revenue')
  }, [goals])

  // Project breakdown for mini chart
  const projectBreakdown = useMemo(() => {
    const projectMap = new Map<string, { name: string; color: string; minutes: number }>()
    for (const entry of todayEntries) {
      const projId = entry.projectId || '_none'
      const existing = projectMap.get(projId) || { name: entry.project?.name || 'Sans projet', color: entry.project?.color || '#71717a', minutes: 0 }
      existing.minutes += entry.duration || 0
      projectMap.set(projId, existing)
    }
    return Array.from(projectMap.entries()).map(([id, data]) => ({
      id,
      ...data,
      hours: Math.round(data.minutes / 60 * 100) / 100,
    }))
  }, [todayEntries])

  // Handle start timer
  const handleStart = useCallback(() => {
    if (activeTimer && isPaused) {
      setIsPaused(false)
      return
    }
    startTimer({
      taskId: timerTaskId || undefined,
      projectId: timerProjectId || undefined,
      description: timerDescription,
      isBillable: timerBillable,
    })
  }, [activeTimer, isPaused, timerTaskId, timerProjectId, timerDescription, timerBillable, startTimer])

  // Handle pause
  const handlePause = useCallback(() => {
    setIsPaused(true)
  }, [])

  // Handle stop
  const handleStop = useCallback(async () => {
    await stopTimer()
    setTimerSeconds(0)
    setIsPaused(false)
    setTimerTaskId('')
    setTimerProjectId('')
    setTimerDescription('')
    setTimerBillable(true)
  }, [stopTimer])

  // Quick timer actions
  const handleQuickTimer = useCallback(async (minutes: number) => {
    const now = new Date()
    const start = new Date(now.getTime() - minutes * 60000)
    await createTimeEntry({
      startTime: start.toISOString(),
      endTime: now.toISOString(),
      duration: minutes,
      description: 'Session rapide',
      isBillable: true,
    })
    toast.success(`${minutes} minutes ajoutées`)
  }, [createTimeEntry])

  // Save billing goal
  const handleSaveGoal = useCallback(async () => {
    await setBillingGoal({
      targetHours: Number(goalForm.targetHours),
      hourlyRate: Number(goalForm.hourlyRate),
      targetRevenue: Number(goalForm.targetRevenue),
    })
    setGoalDialogOpen(false)
    toast.success('Objectifs de facturation mis à jour')
  }, [goalForm, setBillingGoal])

  // Manual entry save
  const handleManualSave = useCallback(() => {
    if (!manualEntry.date || !manualEntry.startTime || !manualEntry.endTime) return

    const startISO = new Date(`${manualEntry.date}T${manualEntry.startTime}`).toISOString()
    const endISO = new Date(`${manualEntry.date}T${manualEntry.endTime}`).toISOString()
    const diffMs = new Date(endISO).getTime() - new Date(startISO).getTime()
    const duration = Math.round(diffMs / 60000)

    if (duration <= 0) return

    createTimeEntry({
      startTime: startISO,
      endTime: endISO,
      duration,
      description: manualEntry.description || null,
      isBillable: manualEntry.isBillable,
      taskId: manualEntry.taskId || null,
      projectId: manualEntry.projectId || null,
    })

    setManualDialogOpen(false)
    setManualEntry({
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      taskId: '',
      projectId: '',
      description: '',
      isBillable: false,
    })
  }, [manualEntry, createTimeEntry])

  // Chart colors
  const EMERALD = '#10b981'
  const AMBER = '#f59e0b'
  const PIE_COLORS = [EMERALD, AMBER]

  // Revenue from active timer
  const activeTimerRevenue = useMemo(() => {
    if (!activeTimer || !timeGoals?.hourlyRate) return 0
    return Math.round(timerSeconds / 3600 * timeGoals.hourlyRate * 100) / 100
  }, [activeTimer, timerSeconds, timeGoals])

  return (
    <div className="space-y-6">
      {/* ─── Top Row: Active Timer + Daily Summary ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Timer Card */}
        <Card className={`lg:col-span-2 border-2 ${activeTimer && !isPaused ? 'border-emerald-500/60' : 'border-zinc-800'} bg-zinc-900/60`}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Timer display */}
              <div className="flex flex-col items-center justify-center min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-zinc-400">
                    {activeTimer ? (isPaused ? 'En pause' : 'En cours') : 'Chronomètre'}
                  </span>
                </div>
                <div className="text-5xl font-mono font-bold text-zinc-100 tracking-wider">
                  {activeTimer ? formatTimerDisplay(timerSeconds) : '00:00:00'}
                </div>
                {activeTimer && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {isPaused ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    <span className={`text-xs ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isPaused ? 'Pause' : 'Actif'}
                    </span>
                  </div>
                )}
                {/* Revenue counter */}
                {activeTimer && timeGoals?.hourlyRate ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">{activeTimerRevenue.toFixed(2)}€</span>
                  </motion.div>
                ) : null}
              </div>

              {/* Timer controls form */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-500 text-xs">Tâche</Label>
                    <Select value={effectiveTaskId} onValueChange={setTimerTaskId} disabled={!!activeTimer}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 text-sm h-9">
                        <SelectValue placeholder="Sélectionner une tâche" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {tasks.filter(t => t.status !== 'done').map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-zinc-300">{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-500 text-xs">Projet</Label>
                    <Select value={effectiveProjectId} onValueChange={setTimerProjectId} disabled={!!activeTimer}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 text-sm h-9">
                        <SelectValue placeholder="Sélectionner un projet" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-zinc-300">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#10b981' }} />
                              {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-zinc-500 text-xs">Description</Label>
                  <Input
                    placeholder="Sur quoi travaillez-vous ?"
                    value={effectiveDescription}
                    onChange={e => setTimerDescription(e.target.value)}
                    disabled={!!activeTimer}
                    className="bg-zinc-950 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 text-sm h-9"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={effectiveBillable} onCheckedChange={setTimerBillable} disabled={!!activeTimer} />
                    <Label className="text-zinc-500 text-xs">Facturable</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    {!activeTimer ? (
                      <Button onClick={handleStart} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
                        <Play className="w-4 h-4 mr-1.5" />
                        Démarrer
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={isPaused ? handleStart : handlePause}
                          className={`h-9 ${isPaused ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/10' : 'border-amber-600 text-amber-400 hover:bg-amber-600/10'}`}>
                          {isPaused ? <Play className="w-4 h-4 mr-1.5" /> : <Pause className="w-4 h-4 mr-1.5" />}
                          {isPaused ? 'Reprendre' : 'Pause'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleStop} className="h-9 border-red-600 text-red-400 hover:bg-red-600/10">
                          <Square className="w-4 h-4 mr-1.5" />
                          Arrêter
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Timer Actions */}
                {!activeTimer && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-zinc-500">Rapide :</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      onClick={() => handleQuickTimer(30)}>30min</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      onClick={() => handleQuickTimer(60)}>1h</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      onClick={() => handleQuickTimer(120)}>2h</Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Summary Card */}
        <div className="space-y-4">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-zinc-300">Aujourd&apos;hui</span>
                </div>
                <span className="text-2xl font-bold text-zinc-100">{todaySummary.totalHours}h</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Facturable</span>
                  <span className="text-emerald-400">{todaySummary.billableHours}h</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Revenu</span>
                  <span className="text-emerald-400 font-semibold">{todaySummary.revenue}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Break Indicator */}
          {breakSuggestion?.shouldBreak && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-amber-500/40 bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {breakSuggestion.breakType === 'stop' ? (
                        <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                      ) : (
                        <Coffee className="w-5 h-5 text-amber-400 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-300">
                        {breakSuggestion.breakType === 'stop' ? 'Arrêtez-vous !' : breakSuggestion.breakType === 'long' ? 'Pause longue' : 'Courte pause'}
                      </p>
                      <p className="text-xs text-amber-400/70 mt-1">{breakSuggestion.reason}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{Math.floor(breakSuggestion.workedMinutes / 60)}h{breakSuggestion.workedMinutes % 60}m travaillées</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── Billing Goal Progress Bar ─────────────────── */}
      {timeGoals && (
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-zinc-300">Objectif hebdomadaire</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">
                  {timeGoals.billableHours}h / {timeGoals.targetHours}h facturées
                </span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
                  onClick={() => handleGoalDialogOpen(true)}>
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Progress
                value={timeGoals.percentageProgress}
                className={`h-3 ${timeGoals.percentageProgress >= 100 ? '[&>[data-slot=progress-indicator]]:bg-emerald-500' : '[&>[data-slot=progress-indicator]]:bg-amber-500'}`}
              />
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{timeGoals.percentageProgress}% atteint</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    {timeGoals.revenue}€ / {timeGoals.targetRevenue}€
                  </span>
                </div>
              </div>
            </div>

            {/* Mini project breakdown */}
            {timeGoals.projectBreakdown.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Répartition par projet</p>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-zinc-800">
                  {timeGoals.projectBreakdown.map((proj, idx) => {
                    const pct = timeGoals.billableHours > 0 ? (proj.billableHours / timeGoals.billableHours) * 100 : 0
                    return (
                      <motion.div
                        key={proj.projectId || idx}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className="h-full rounded-sm"
                        style={{ backgroundColor: proj.projectColor }}
                        title={`${proj.projectName}: ${proj.billableHours}h`}
                      />
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {timeGoals.projectBreakdown.map((proj, idx) => (
                    <span key={proj.projectId || idx} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.projectColor }} />
                      {proj.projectName} ({proj.billableHours}h)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Today's Time Entries ───────────────────── */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <CardTitle className="text-zinc-200 text-base">Entrées du jour</CardTitle>
            </div>
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-zinc-700 text-zinc-400 hover:text-zinc-200">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Saisie manuelle
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-zinc-100">Saisie manuelle</DialogTitle>
                  <DialogDescription className="text-zinc-500">
                    Ajoutez une entrée de temps manuellement.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Date</Label>
                      <Input type="date" value={manualEntry.date}
                        onChange={e => setManualEntry(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Début</Label>
                      <Input type="time" value={manualEntry.startTime}
                        onChange={e => setManualEntry(prev => ({ ...prev, startTime: e.target.value }))}
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Fin</Label>
                      <Input type="time" value={manualEntry.endTime}
                        onChange={e => setManualEntry(prev => ({ ...prev, endTime: e.target.value }))}
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Tâche</Label>
                      <Select value={manualEntry.taskId} onValueChange={v => setManualEntry(prev => ({ ...prev, taskId: v }))}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm">
                          <SelectValue placeholder="Aucune tâche" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {tasks.map(t => <SelectItem key={t.id} value={t.id} className="text-zinc-300">{t.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Projet</Label>
                      <Select value={manualEntry.projectId} onValueChange={v => setManualEntry(prev => ({ ...prev, projectId: v }))}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm">
                          <SelectValue placeholder="Aucun projet" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {projects.map(p => <SelectItem key={p.id} value={p.id} className="text-zinc-300">{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Description</Label>
                    <Input placeholder="Description de l'activité..." value={manualEntry.description}
                      onChange={e => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 text-sm" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={manualEntry.isBillable} onCheckedChange={v => setManualEntry(prev => ({ ...prev, isBillable: v }))} />
                    <Label className="text-zinc-400 text-xs">Facturable</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setManualDialogOpen(false)} className="text-zinc-400 hover:text-zinc-200">Annuler</Button>
                  <Button onClick={handleManualSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">
              Aucune entrée de temps aujourd&apos;hui
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                <AnimatePresence>
                  {todayEntries.map((entry, idx) => {
                    const task = entry.task || tasks.find(t => t.id === entry.taskId)
                    const project = entry.project || projects.find(p => p.id === entry.projectId)

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50"
                      >
                        <div className="text-xs font-mono text-zinc-400 min-w-[100px]">
                          {formatTimeRange(entry.startTime, entry.endTime)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 truncate">
                            {entry.description || (task?.title) || 'Sans description'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {task && <span className="text-[10px] text-zinc-500">{task.title}</span>}
                            {project && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color || '#10b981' }} />
                                {project.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-zinc-300 min-w-[60px] text-right">
                          {formatDuration(entry.duration)}
                        </div>
                        {entry.isBillable && (
                          <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-emerald-600/40 text-emerald-400">
                            <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                            Facturable
                          </Badge>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ─── This Week Summary ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="text-3xl font-bold text-zinc-100">{weekData.totalHours}</p>
            <p className="text-sm text-zinc-500 mt-1">heures cette semaine</p>
            <div className="flex items-center gap-3 mt-3 text-xs">
              <span className="text-emerald-400">{weekData.billableHours}h facturées</span>
              <span className="text-zinc-700">|</span>
              <span className="text-amber-400">{weekData.nonBillableHours}h non facturées</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-300 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Répartition facturable
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-full h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={weekData.billableData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {weekData.billableData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#d4d4d8' }}
                    formatter={(value: number) => [`${Math.round(value / 60 * 10) / 10}h`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 ml-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EMERALD }} />
                <span className="text-xs text-zinc-400">Facturable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: AMBER }} />
                <span className="text-xs text-zinc-400">Non facturable</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-300 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Heures par jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData.dailyData} barSize={24}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={30} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="heures" fill={EMERALD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Billing Goals Section ──────────────────── */}
      {billingGoals.length > 0 && (
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-zinc-200 text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Objectifs de la semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingGoals.map(goal => {
                const target = goal.target || 0
                const current = goal.current || 0
                const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0
                const isHours = goal.unit === 'hours'

                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-300">{goal.title}</span>
                        {goal.completed && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-emerald-600/40 text-emerald-400">Atteint</Badge>
                        )}
                      </div>
                      <span className="text-sm text-zinc-400">
                        {isHours ? `${current.toFixed(1)}h / ${target.toFixed(1)}h` : `${current.toFixed(0)}€ / ${target.toFixed(0)}€`}
                      </span>
                    </div>
                    <Progress value={progress}
                      className={`h-2 ${goal.completed ? '[&>[data-slot=progress-indicator]]:bg-emerald-500' : '[&>[data-slot=progress-indicator]]:bg-amber-500'}`} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Reports Link ──────────────────── */}
      <div className="flex justify-center">
        <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-zinc-200"
          onClick={() => useAppStore.getState().setActiveTab('time')}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Voir les rapports détaillés
        </Button>
      </div>

      {/* ─── Billing Goal Settings Dialog ──────────── */}
      <Dialog open={goalDialogOpen} onOpenChange={handleGoalDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Objectifs de facturation</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Configurez vos objectifs hebdomadaires de facturation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Heures cibles par semaine</Label>
              <Input type="number" value={goalForm.targetHours}
                onChange={e => setGoalForm(prev => ({ ...prev, targetHours: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Taux horaire (€/h)</Label>
              <Input type="number" value={goalForm.hourlyRate}
                onChange={e => setGoalForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Revenu cible par semaine (€)</Label>
              <Input type="number" value={goalForm.targetRevenue}
                onChange={e => setGoalForm(prev => ({ ...prev, targetRevenue: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-zinc-300 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGoalDialogOpen(false)} className="text-zinc-400 hover:text-zinc-200">Annuler</Button>
            <Button onClick={handleSaveGoal} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
