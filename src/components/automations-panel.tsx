'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Receipt, Video, Mail, RefreshCw,
  CheckCircle, XCircle, Clock, Activity, ChevronRight
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
}

// ─── Mock activity logs ──────────────────────────────────────────────

const generateMockLogs = (): ActivityLogEntry[] => [
  { id: 'log-1', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), type: 'overdue_tasks', action: 'Vérification des tâches', details: '2 tâches en retard détectées', success: true },
  { id: 'log-2', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), type: 'unpaid_invoices', action: 'Rappel facture', details: 'Facture INV-2024-031 rappel envoyé', success: true },
  { id: 'log-3', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: 'meeting_reminder', action: 'Rappel réunion', details: 'Réunion "Sprint Review" dans 2h', success: true },
  { id: 'log-4', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: 'email_followup', action: 'Suivi email', details: '3 emails sans réponse depuis 48h', success: true },
  { id: 'log-5', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), type: 'overdue_tasks', action: 'Vérification des tâches', details: 'Aucune tâche en retard', success: true },
  { id: 'log-6', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), type: 'unpaid_invoices', action: 'Rappel facture', details: 'Échec d\'envoi de l\'email de rappel', success: false },
  { id: 'log-7', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), type: 'meeting_reminder', action: 'Rappel réunion', details: 'Réunion "Client Onboarding" dans 1h', success: true },
  { id: 'log-8', timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), type: 'email_followup', action: 'Suivi email', details: '1 email sans réponse depuis 72h', success: true },
  { id: 'log-9', timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), type: 'overdue_tasks', action: 'Vérification des tâches', details: '1 tâche en retard détectée', success: true },
  { id: 'log-10', timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), type: 'unpaid_invoices', action: 'Rappel facture', details: 'Facture INV-2024-028 rappel envoyé', success: true },
  { id: 'log-11', timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(), type: 'meeting_reminder', action: 'Rappel réunion', details: 'Aucune réunion à venir', success: true },
  { id: 'log-12', timestamp: new Date(Date.now() - 1000 * 60 * 480).toISOString(), type: 'email_followup', action: 'Suivi email', details: 'Échec de connexion au serveur mail', success: false },
]

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

// ─── Component ───────────────────────────────────────────────────────

export function AutomationsSection() {
  const { tasks, invoices, meetings, emails } = useAppStore()

  const [preferences, setPreferences] = useState<Record<string, AutomationPreference>>({
    overdue_tasks: { enabled: true, channel: 'in_app', frequency: '30min', threshold: 1 },
    unpaid_invoices: { enabled: true, channel: 'email', frequency: 'daily', threshold: 7 },
    meeting_reminder: { enabled: true, channel: 'both', frequency: '15min', threshold: 24 },
    email_followup: { enabled: false, channel: 'in_app', frequency: '1h', threshold: 2 },
  })

  const [logs] = useState<ActivityLogEntry[]>(generateMockLogs())
  const [logDisplayCount, setLogDisplayCount] = useState(20)
  const [isChecking, setIsChecking] = useState(false)

  const displayedLogs = useMemo(() => {
    return logs.slice(0, logDisplayCount)
  }, [logs, logDisplayCount])

  // ─── Handlers ──────────────────────────────────────────────────────

  const updatePreference = (type: string, field: keyof AutomationPreference, value: unknown) => {
    setPreferences(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }))
  }

  const handleCheckNow = async () => {
    setIsChecking(true)
    toast.info('Vérification en cours...')
    // Simulate async check
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsChecking(false)
    toast.success('Vérification terminée — tout est à jour')
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
              {Object.values(preferences).filter(p => p.enabled).length} active{Object.values(preferences).filter(p => p.enabled).length !== 1 ? 's' : ''} sur {automationTypes.length}
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
          const pref = preferences[autoType.type]
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
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={(checked) => updatePreference(autoType.type, 'enabled', checked)}
                      className="data-[state=checked]:bg-emerald-500 flex-shrink-0"
                    />
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
          {displayedLogs.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune activité enregistrée</p>
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
        </div>

        {/* Load more */}
        {logDisplayCount < logs.length && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setLogDisplayCount(prev => prev + 20)}
          >
            Voir plus
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
