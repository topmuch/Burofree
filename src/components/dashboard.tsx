'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, Plus, Play, FileText, Clock, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { StatsCards } from '@/components/stats-cards'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function Dashboard() {
  const { stats, briefing, fetchBriefing, fetchStats, fetchSuggestions, suggestions, tasks, events, goals, setActiveTab } = useAppStore()
  const [loadingBriefing, setLoadingBriefing] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchSuggestions()
  }, [fetchStats, fetchSuggestions])

  const handleBriefing = async () => {
    setLoadingBriefing(true)
    await fetchBriefing()
    setLoadingBriefing(false)
  }

  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date())
  const todayTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString())
  const todayEvents = events.filter(e => new Date(e.startDate).toDateString() === new Date().toDateString())

  return (
    <div className="space-y-6">
      {/* Greeting & Briefing */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-500/10 to-amber-500/5 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {getGreeting()}, <span className="text-emerald-400">Alex</span> 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Button
                onClick={handleBriefing}
                disabled={loadingBriefing}
                className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                variant="outline"
              >
                {loadingBriefing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {briefing ? 'Rafraîchir' : 'Générer le briefing'}
              </Button>
            </div>

            <AnimatePresence>
              {briefing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 rounded-lg bg-background/50 border border-border"
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

      {/* Stats Cards */}
      <StatsCards />

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Suggestions IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <span className="text-lg">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{s.title}</p>
                      <Badge variant={s.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {s.priority === 'high' ? 'Urgent' : 'Moyen'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.message}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="flex-shrink-0 text-xs" onClick={() => setActiveTab(s.actionUrl.replace('#', '') as 'tasks' | 'emails' | 'invoices')}>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Objectifs de la semaine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal) => {
              const progress = goal.target ? Math.min((goal.current / goal.target) * 100, 100) : 0
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{goal.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {goal.current}{goal.target ? `/${goal.target}` : ''} {goal.unit === 'tasks' ? 'tâches' : goal.unit === 'hours' ? 'h' : '€'}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )
            })}
            {goals.length === 0 && <p className="text-sm text-muted-foreground">Aucun objectif cette semaine</p>}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Tâches à venir
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => setActiveTab('tasks')}>
                Voir tout <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {todayTasks.slice(0, 5).map((task) => (
              <div key={task.id} className={`flex items-center gap-3 p-2 rounded-lg bg-secondary/50 ${task.priority === 'urgent' ? 'task-urgent' : task.priority === 'high' ? 'task-high' : 'task-medium'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.project && (
                      <Badge variant="outline" className="text-[10px] h-4" style={{ borderColor: task.project.color, color: task.project.color }}>
                        {task.project.name}
                      </Badge>
                    )}
                    <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'} className="text-[10px] h-4">
                      {task.priority === 'urgent' ? 'Urgent' : task.priority === 'high' ? 'Élevée' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                    </Badge>
                  </div>
                </div>
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            ))}
            {overdueTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 task-overdue">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.title}</p>
                  <span className="text-xs text-red-400">En retard</span>
                </div>
              </div>
            ))}
            {todayTasks.length === 0 && overdueTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune tâche à venir</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Heures cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats?.weekDays || []}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="totalHours" stroke="#10b981" fillOpacity={1} fill="url(#colorHours)" name="Heures" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.monthlyData || []}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} €`, 'Revenu']}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Revenu" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Today's Events */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Événements d&apos;aujourd&apos;hui
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => setActiveTab('calendar')}>
              Calendrier <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayEvents.length > 0 ? (
            <div className="space-y-2">
              {todayEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: event.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.allDay ? 'Toute la journée' : new Date(event.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {event.type === 'meeting' ? 'Réunion' : event.type === 'deadline' ? 'Deadline' : event.type === 'block' ? 'Focus' : 'Rappel'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun événement aujourd&apos;hui</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setActiveTab('tasks')} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
        </Button>
        <Button onClick={() => setActiveTab('invoices')} variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
          <FileText className="w-4 h-4 mr-2" /> Nouvelle facture
        </Button>
        <Button onClick={() => setActiveTab('time')} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Play className="w-4 h-4 mr-2" /> Démarrer chrono
        </Button>
      </div>
    </div>
  )
}
