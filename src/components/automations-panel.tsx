'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Receipt, Video, Mail, RefreshCw,
  CheckCircle, XCircle, Clock, Activity, ChevronRight, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────

interface AutomationConfig {
  type: string
  label: string
  icon: React.ElementType
  description: string
  defaultThreshold: number
  thresholdUnit: string
}

interface AutomationPreference {
  id?: string
  enabled: boolean
  channel: 'in_app' | 'email' | 'both'
  frequency: '15min' | '30min' | '1h' | 'daily'
  threshold: number
}

interface ActivityLogEntry {
  id: string
  timestamp: string
  type: string
  action: string
  details: string
  success: boolean
}

// ─── Constants ───────────────────────────────────────────────────────

const automationTypes: AutomationConfig[] = [
  {
    type: 'overdue_tasks',
    label: 'Tâches en retard',
    icon: AlertTriangle,
    description: 'Notification quand une tâche dépasse sa date limite',
    defaultThreshold: 1,
    thresholdUnit: 'jours',
  },
  {
    type: 'unpaid_invoices',
    label: 'Factures impayées',
    icon: Receipt,
    description: 'Rappel pour les factures non payées depuis X jours',
    defaultThreshold: 7,
    thresholdUnit: 'jours',
  },
  {
    type: 'meeting_reminder',
    label: 'Réunions à venir',
    icon: Video,
    description: 'Rappel X heures avant une réunion planifiée',
    defaultThreshold: 24,
    thresholdUnit: 'heures',
  },
  {
    type: 'email_followup',
    label: 'Emails sans réponse',
    icon: Mail,
    description: 'Suivi des emails envoyés sans réponse depuis X jours',
    defaultThreshold: 2,
    thresholdUnit: 'jours',
  },
]

const channelLabels: Record<string, string> = {
  in_app: 'In-app',
  email: 'Email',
  both: 'Les deux',
}

const frequencyLabels: Record<string, string> = {
  '15min': '15 min',
  '30min': '30 min',
  '1h': '1 heure',
  daily: 'Quotidien',
}

const typeIconMap: Record<string, React.ElementType> = {
  overdue_tasks: AlertTriangle,
  unpaid_invoices: Receipt,
  meeting_reminder: Video,
  email_followup: Mail,
  system: Activity,
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'Hier'
  return `il y a ${diffDays}j`
}

function getAutomationColor(type: string): string {
  switch (type) {
    case 'overdue_tasks': return 'text-amber-400'
    case 'unpaid_invoices': return 'text-red-400'
    case 'meeting_reminder': return 'text-emerald-400'
    case 'email_followup': return 'text-cyan-400'
    default: return 'text-muted-foreground'
  }
}

function getAutomationBgColor(type: string): string {
  switch (type) {
    case 'overdue_tasks': return 'bg-amber-500/10'
    case 'unpaid_invoices': return 'bg-red-500/10'
    case 'meeting_reminder': return 'bg-emerald-500/10'
    case 'email_followup': return 'bg-cyan-500/10'
    default: return 'bg-secondary'
  }
}

// Default preference when API hasn't responded yet
function getDefaultPreference(type: string): AutomationPreference {
  const config = automationTypes.find(t => t.type === type)
  return {
    enabled: true,
    channel: 'in_app',
    frequency: '30min',
    threshold: config?.defaultThreshold || 7,
  }
}

// ─── Component ───────────────────────────────────────────────────────

export function AutomationsSection() {
  const { tasks, invoices, meetings, emails } = useAppStore()

  const [preferences, setPreferences] = useState<Record<string, AutomationPreference>>({})
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false)

  // ─── Fetch preferences on mount ───────────────────────────────────

  const fetchPreferences = useCallback(async () => {
    try {
      setLoadingPrefs(true)
      const res = await fetch('/api/automations/preferences')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const prefsMap: Record<string, AutomationPreference> = {}
      for (const p of data) {
        prefsMap[p.type] = {
          id: p.id,
          enabled: p.enabled,
          channel: p.channel,
          frequency: p.frequency,
          threshold: p.threshold,
        }
      }
      // Fill in defaults for any missing types
      for (const autoType of automationTypes) {
        if (!prefsMap[autoType.type]) {
          prefsMap[autoType.type] = getDefaultPreference(autoType.type)
        }
      }
      setPreferences(prefsMap)
    } catch {
      toast.error('Erreur lors du chargement des préférences')
    } finally {
      setLoadingPrefs(false)
    }
  }, [])

  // ─── Fetch logs on mount ──────────────────────────────────────────

  const fetchLogs = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreLogs(true)
      } else {
        setLoadingLogs(true)
      }
      const res = await fetch(`/api/automations/logs?page=${page}&limit=20`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const mappedLogs: ActivityLogEntry[] = (data.logs || []).map((l: Record<string, unknown>) => ({
        id: l.id as string,
        timestamp: l.createdAt as string,
        type: l.type as string,
        action: l.action as string,
        details: (l.details as string) || '',
        success: l.success as boolean,
      }))
      if (append) {
        setLogs(prev => [...prev, ...mappedLogs])
      } else {
        setLogs(mappedLogs)
      }
      setLogsTotalPages(data.pagination?.totalPages || 1)
    } catch {
      toast.error('Erreur lors du chargement des logs')
    } finally {
      setLoadingLogs(false)
      setLoadingMoreLogs(false)
    }
  }, [])

  useEffect(() => {
    fetchPreferences()
    fetchLogs(1)
  }, [fetchPreferences, fetchLogs])

  const displayedLogs = useMemo(() => {
    return logs
  }, [logs])

  // ─── Handlers ──────────────────────────────────────────────────────

  const updatePreference = async (type: string, field: keyof AutomationPreference, value: unknown) => {
    // Optimistic update
    const prevPrefs = { ...preferences }
    setPreferences(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }))

    try {
      const res = await fetch('/api/automations/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, [field]: value }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setPreferences(prev => ({
        ...prev,
        [type]: {
          id: updated.id,
          enabled: updated.enabled,
          channel: updated.channel,
          frequency: updated.frequency,
          threshold: updated.threshold,
        }
      }))

      // Toast for toggle changes
      if (field === 'enabled') {
        toast.success(value ? `${automationTypes.find(a => a.type === type)?.label} activé` : `${automationTypes.find(a => a.type === type)?.label} désactivé`)
      } else {
        toast.success('Préférence mise à jour')
      }
    } catch {
      // Revert on error
      setPreferences(prevPrefs)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleCheckNow = async () => {
    setIsChecking(true)
    try {
      const res = await fetch('/api/automations/check', { method: 'POST' })
      if (!res.ok) throw new Error()
      const summary = await res.json()
      toast.success(`${summary.totalNotified || 0} notification(s) envoyée(s)`)
      // Refresh logs after check
      setLogsPage(1)
      await fetchLogs(1)
    } catch {
      toast.error('Erreur lors de la vérification')
    } finally {
      setIsChecking(false)
    }
  }

  const handleLoadMoreLogs = async () => {
    const nextPage = logsPage + 1
    setLogsPage(nextPage)
    await fetchLogs(nextPage, true)
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Rappels & Automatisations</h2>
            <p className="text-xs text-muted-foreground">
              {loadingPrefs
                ? 'Chargement...'
                : `${Object.values(preferences).filter(p => p.enabled).length} active${Object.values(preferences).filter(p => p.enabled).length !== 1 ? 's' : ''} sur ${automationTypes.length}`
              }
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckNow}
          disabled={isChecking}
          className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isChecking && 'animate-spin')} />
          Vérifier maintenant
        </Button>
      </div>

      {/* Preference Cards */}
      <div className="space-y-3">
        {automationTypes.map((autoType, index) => {
          const pref = preferences[autoType.type] || getDefaultPreference(autoType.type)
          const IconComp = autoType.icon
          const color = getAutomationColor(autoType.type)
          const bgColor = getAutomationBgColor(autoType.type)

          return (
            <motion.div
              key={autoType.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card className={cn(!pref.enabled && 'opacity-60')}>
                <CardContent className="p-4 space-y-4">
                  {/* Top row: icon + title + toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg flex-shrink-0', bgColor)}>
                        <IconComp className={cn('w-5 h-5', color)} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-medium">{autoType.label}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {autoType.description}
                        </CardDescription>
                      </div>
                    </div>
                    {loadingPrefs ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Switch
                        checked={pref.enabled}
                        onCheckedChange={(checked) => updatePreference(autoType.type, 'enabled', checked)}
                        className="data-[state=checked]:bg-emerald-500 flex-shrink-0"
                      />
                    )}
                  </div>

                  {/* Settings row (visible when enabled) */}
                  <AnimatePresence>
                    {pref.enabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {/* Channel */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Canal</Label>
                            <Select
                              value={pref.channel}
                              onValueChange={(v) => updatePreference(autoType.type, 'channel', v)}
                            >
                              <SelectTrigger className="bg-secondary h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_app">In-app</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="both">Les deux</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Frequency */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Fréquence</Label>
                            <Select
                              value={pref.frequency}
                              onValueChange={(v) => updatePreference(autoType.type, 'frequency', v)}
                            >
                              <SelectTrigger className="bg-secondary h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15min">15 min</SelectItem>
                                <SelectItem value="30min">30 min</SelectItem>
                                <SelectItem value="1h">1 heure</SelectItem>
                                <SelectItem value="daily">Quotidien</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Threshold */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">
                              Seuil ({autoType.thresholdUnit})
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              value={pref.threshold}
                              onChange={(e) => updatePreference(autoType.type, 'threshold', parseInt(e.target.value) || autoType.defaultThreshold)}
                              className="bg-secondary h-8 text-xs"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Activity Log */}
      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Journal d&apos;activité</h3>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {logs.length} entrée{logs.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1.5">
          {loadingLogs ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-md animate-pulse">
                <div className="p-1 rounded flex-shrink-0 mt-0.5 bg-muted">
                  <div className="w-3.5 h-3.5 bg-muted-foreground/20 rounded" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-48 bg-muted rounded" />
                </div>
                <div className="h-2.5 w-10 bg-muted rounded" />
              </div>
            ))
          ) : displayedLogs.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune activité enregistrée</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliquez sur &quot;Vérifier maintenant&quot; pour lancer une vérification
                </p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {displayedLogs.map((log, index) => {
                const LogIcon = typeIconMap[log.type] || Activity
                const logColor = getAutomationColor(log.type)

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-2.5 p-2.5 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    {/* Type icon */}
                    <div className={cn('p-1 rounded flex-shrink-0 mt-0.5', getAutomationBgColor(log.type))}>
                      <LogIcon className={cn('w-3.5 h-3.5', logColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{log.action}</p>
                        {log.success ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {log.details}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 mt-1">
                      {getRelativeTime(log.timestamp)}
                    </span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}

          {/* Loading more indicator */}
          {loadingMoreLogs && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="ml-2 text-xs text-muted-foreground">Chargement...</span>
            </div>
          )}
        </div>

        {/* Load more */}
        {logsPage < logsTotalPages && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={handleLoadMoreLogs}
            disabled={loadingMoreLogs}
          >
            Voir plus
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
