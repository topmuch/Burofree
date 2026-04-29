'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Shield,
  Check,
  X,
  Eye,
  RefreshCw,
  Filter,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ─────────────────────────────────────────────────────────────────

interface SecurityAlert {
  id: string
  userId: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive'
  metadata: string | null
  ipAddress: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

interface AlertsResponse {
  alerts: SecurityAlert[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Severity Helpers ──────────────────────────────────────────────────────

function severityBadge(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/40'
    case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    case 'medium': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
    case 'low': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    default: return 'bg-secondary text-secondary-foreground border-border'
  }
}

function severityIcon(severity: string) {
  switch (severity) {
    case 'critical': return '🔴'
    case 'high': return '🟠'
    case 'medium': return '🟡'
    case 'low': return '🔵'
    default: return '⚪'
  }
}

function severityLabel(severity: string) {
  switch (severity) {
    case 'critical': return 'Critique'
    case 'high': return 'Élevée'
    case 'medium': return 'Moyenne'
    case 'low': return 'Basse'
    default: return severity
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'active': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'acknowledged': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'resolved': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'false_positive': return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
    default: return 'bg-secondary text-secondary-foreground border-border'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'active': return 'Active'
    case 'acknowledged': return 'Acquittée'
    case 'resolved': return 'Résolue'
    case 'false_positive': return 'Faux positif'
    default: return status
  }
}

function typeLabel(type: string) {
  switch (type) {
    case 'multiple_ip_login': return 'Connexions multi-IP'
    case 'bulk_export': return 'Exports en masse'
    case 'bulk_delete': return 'Suppressions en masse'
    case 'brute_force': return 'Force brute'
    case 'suspicious_login': return 'Connexion suspecte'
    default: return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function SecurityAlertsPanel() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ─── Fetch Alerts ─────────────────────────────────────────────────────

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (severityFilter) params.set('severity', severityFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/security/alerts?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur')

      const data: AlertsResponse = await res.json()
      setAlerts(data.alerts)
      setTotal(data.total)
    } catch {
      toast.error('Erreur lors du chargement des alertes')
    } finally {
      setLoading(false)
    }
  }, [severityFilter, statusFilter])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // ─── Alert Action ─────────────────────────────────────────────────────

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'false_positive') => {
    try {
      const res = await fetch('/api/security/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }

      const actionLabels: Record<string, string> = {
        acknowledge: 'acquittée',
        resolve: 'résolue',
        false_positive: 'marquée comme faux positif',
      }
      toast.success(`Alerte ${actionLabels[action]}`)
      fetchAlerts()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'action')
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────

  const activeCount = alerts.filter(a => a.status === 'active').length
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length
  const highCount = alerts.filter(a => a.severity === 'high' && a.status === 'active').length

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Alertes de sécurité</h3>
            <p className="text-xs text-muted-foreground">
              {total} alerte{total !== 1 ? 's' : ''}
              {criticalCount > 0 && (
                <span className="text-red-400 ml-1">· {criticalCount} critique{criticalCount > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAlerts}
          className="text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Severity Stats Bar */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
            <span className="text-xs">🔴</span>
            <span className="text-xs font-medium text-red-400">{criticalCount} critique{criticalCount > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs">🟠</span>
            <span className="text-xs font-medium text-amber-400">{highCount} élevée{highCount > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">{activeCount} active{activeCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Filtrer</span>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v) }}>
          <SelectTrigger className="h-8 w-[150px] text-xs bg-secondary">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les statuts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acquittée</SelectItem>
            <SelectItem value="resolved">Résolue</SelectItem>
            <SelectItem value="false_positive">Faux positif</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v === '__all__' ? '' : v) }}>
          <SelectTrigger className="h-8 w-[140px] text-xs bg-secondary">
            <SelectValue placeholder="Sévérité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes sévérités</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
            <SelectItem value="high">Élevée</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <AlertSkeleton />
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-10 h-10 text-emerald-500/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune alerte de sécurité</p>
              <p className="text-xs text-muted-foreground mt-1">Tout semble aller bien 👍</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {alerts.map((alert) => {
                  const isExpanded = expandedId === alert.id
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`rounded-lg border p-3 transition-colors ${
                        alert.status === 'active' && alert.severity === 'critical'
                          ? 'border-red-500/30 bg-red-500/5'
                          : alert.status === 'active' && alert.severity === 'high'
                            ? 'border-amber-500/20 bg-amber-500/5'
                            : 'border-border bg-secondary/30'
                      }`}
                    >
                      {/* Alert Header */}
                      <div className="flex items-start gap-3">
                        <div className="text-lg flex-shrink-0 mt-0.5">
                          {severityIcon(alert.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-medium">
                              {typeLabel(alert.type)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 ${severityBadge(alert.severity)}`}
                            >
                              {severityLabel(alert.severity)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 ${statusBadge(alert.status)}`}
                            >
                              {statusLabel(alert.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(alert.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
                            </span>
                            {alert.ipAddress && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                IP: {alert.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {alert.status === 'active' && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, 'acknowledge') }}
                                    className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Acquitter</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, 'resolve') }}
                                    className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Résoudre</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, 'false_positive') }}
                                    className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-500/10"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Faux positif</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}

                        {alert.status === 'acknowledged' && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, 'resolve') }}
                                    className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Résoudre</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, 'false_positive') }}
                                    className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-500/10"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Faux positif</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>

                      {/* Expanded Metadata */}
                      <AnimatePresence>
                        {isExpanded && alert.metadata && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Métadonnées</p>
                              <div className="bg-secondary/50 rounded-lg p-3 font-mono text-xs">
                                <pre className="whitespace-pre-wrap break-words text-emerald-300/80">
                                  {(() => {
                                    try { return JSON.stringify(JSON.parse(alert.metadata), null, 2) }
                                    catch { return alert.metadata }
                                  })()}
                                </pre>
                              </div>
                              {alert.resolvedAt && (
                                <p className="text-[10px] text-muted-foreground mt-2">
                                  Résolue le {format(new Date(alert.resolvedAt), 'd MMM yyyy HH:mm', { locale: fr })}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
