'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

interface AuditLog {
  id: string
  userId: string
  teamId: string | null
  action: string
  target: string | null
  targetId: string | null
  metadata: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string } | null
}

interface AuditLogsResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Action Category Helpers ───────────────────────────────────────────────

type ActionCategory = 'create' | 'update' | 'delete' | 'security' | 'export' | 'login' | 'other'

function getActionCategory(action: string): ActionCategory {
  if (action.includes('.create') || action.includes('.register')) return 'create'
  if (action.includes('.update') || action.includes('.assign') || action.includes('.revoke')) return 'update'
  if (action.includes('.delete') || action.includes('.remove')) return 'delete'
  if (action.startsWith('security.') || action.startsWith('gdpr.') || action.startsWith('consent.') || action.startsWith('encryption.')) return 'security'
  if (action.includes('.export')) return 'export'
  if (action.includes('.login') || action.includes('.logout')) return 'login'
  return 'other'
}

function actionBadgeVariant(category: ActionCategory) {
  switch (category) {
    case 'create': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'update': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'delete': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'security': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'export': return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    case 'login': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
    default: return 'bg-secondary text-secondary-foreground border-border'
  }
}

function formatActionLabel(action: string): string {
  const parts = action.split('.')
  if (parts.length >= 2) {
    const resource = parts[0]
    const act = parts.slice(1).join('.')
    return `${resource}.${act}`
  }
  return action
}

// ─── Filter Options ────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'user.', label: 'Utilisateur' },
  { value: 'task.', label: 'Tâches' },
  { value: 'project.', label: 'Projets' },
  { value: 'invoice.', label: 'Factures' },
  { value: 'email.', label: 'Emails' },
  { value: 'document.', label: 'Documents' },
  { value: 'data.', label: 'Données' },
  { value: 'security.', label: 'Sécurité' },
  { value: 'gdpr.', label: 'RGPD' },
  { value: 'role.', label: 'Rôles' },
  { value: 'encryption.', label: 'Chiffrement' },
  { value: 'consent.', label: 'Consentement' },
  { value: 'team.', label: 'Équipe' },
]

const TARGET_OPTIONS = [
  { value: '', label: 'Toutes les cibles' },
  { value: 'task', label: 'Tâche' },
  { value: 'project', label: 'Projet' },
  { value: 'invoice', label: 'Facture' },
  { value: 'document', label: 'Document' },
  { value: 'email', label: 'Email' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'teamMember', label: 'Membre' },
  { value: 'contract', label: 'Contrat' },
  { value: 'settings', label: 'Paramètres' },
]

// ─── Skeleton Loader ───────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

// ─── Alerts Summary ────────────────────────────────────────────────────────

interface AlertSummary {
  active: number
  high: number
  critical: number
}

function AlertsSummaryBadge({ summary }: { summary: AlertSummary | null }) {
  if (!summary || summary.active === 0) return null

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2"
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-amber-400">
          {summary.active} alerte{summary.active > 1 ? 's' : ''} active{summary.active > 1 ? 's' : ''}
        </span>
        {summary.critical > 0 && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] h-4 px-1.5">
            {summary.critical} critique{summary.critical > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </motion.div>
  )
}

// ─── Metadata Viewer ───────────────────────────────────────────────────────

function MetadataViewer({ metadata }: { metadata: string | null }) {
  const parsed = useMemo(() => {
    if (!metadata) return null
    try {
      return JSON.parse(metadata)
    } catch {
      return undefined // parse failure
    }
  }, [metadata])

  if (!metadata) {
    return <span className="text-xs text-muted-foreground italic">Aucune métadonnée</span>
  }

  if (parsed === undefined) {
    return <span className="text-xs text-muted-foreground">{metadata}</span>
  }

  if (!parsed) {
    return <span className="text-xs text-muted-foreground italic">Aucune métadonnée</span>
  }

  return (
    <div className="bg-secondary/50 rounded-lg p-3 font-mono text-xs max-w-lg overflow-x-auto">
      <pre className="whitespace-pre-wrap break-words text-emerald-300/80">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function AuditLogViewer() {
  // State
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Alert summary
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null)

  const limit = 20

  // ─── Fetch Logs ────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (actionFilter) params.set('action', actionFilter)
      if (targetFilter) params.set('target', targetFilter)
      if (userFilter) params.set('userId', userFilter)
      if (startDate) params.set('startDate', new Date(startDate).toISOString())
      if (endDate) params.set('endDate', new Date(endDate + 'T23:59:59').toISOString())

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur lors du chargement')

      const data: AuditLogsResponse = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      console.error('Fetch audit logs error:', err)
      toast.error('Erreur lors du chargement des logs')
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, targetFilter, userFilter, startDate, endDate])

  // ─── Fetch Alerts Summary ─────────────────────────────────────────────

  const fetchAlertSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/security/alerts?status=active&limit=1')
      if (res.ok) {
        const data = await res.json()
        const alerts = data.alerts || []
        const highCount = alerts.filter((a: any) => a.severity === 'high' || a.severity === 'critical').length
        const criticalCount = alerts.filter((a: any) => a.severity === 'critical').length
        setAlertSummary({
          active: data.total || 0,
          high: highCount,
          critical: criticalCount,
        })
      }
    } catch {
      // Silently fail — alerts summary is non-critical
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    fetchAlertSummary()
  }, [fetchAlertSummary])

  // ─── Export CSV ────────────────────────────────────────────────────────

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('limit', '1000')
      if (actionFilter) params.set('action', actionFilter)
      if (targetFilter) params.set('target', targetFilter)
      if (userFilter) params.set('userId', userFilter)
      if (startDate) params.set('startDate', new Date(startDate).toISOString())
      if (endDate) params.set('endDate', new Date(endDate + 'T23:59:59').toISOString())

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error()

      const data: AuditLogsResponse = await res.json()

      const csvHeader = 'Date,Utilisateur,Email,Action,Cible,IP\n'
      const csvRows = data.logs.map((log) => {
        const date = format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')
        const userName = log.user?.name || 'Inconnu'
        const email = log.user?.email || ''
        const action = log.action
        const target = log.target || ''
        const ip = log.ip || ''
        return `"${date}","${userName}","${email}","${action}","${target}","${ip}"`
      }).join('\n')

      const blob = new Blob(['\ufeff' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`${data.logs.length} logs exportés en CSV`)
    } catch {
      toast.error('Erreur lors de l\'export CSV')
    }
  }

  // ─── Reset Filters ────────────────────────────────────────────────────

  const handleResetFilters = () => {
    setActionFilter('')
    setTargetFilter('')
    setUserFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const hasActiveFilters = actionFilter || targetFilter || userFilter || startDate || endDate

  // ─── Pagination Helpers ───────────────────────────────────────────────

  const canPrev = page > 1
  const canNext = page < totalPages

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Journal d&apos;audit</h3>
            <p className="text-xs text-muted-foreground">
              {total} entrée{total !== 1 ? 's' : ''} au total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertsSummaryBadge summary={alertSummary} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exporter en CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchLogs(); fetchAlertSummary() }}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filtres</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-[10px] h-6 px-2 text-red-400 hover:text-red-300"
              >
                Réinitialiser
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Action Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Action</label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === '__all__' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9 text-xs bg-secondary">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les actions</SelectItem>
                  {ACTION_OPTIONS.filter(o => o.value).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cible</label>
              <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v === '__all__' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9 text-xs bg-secondary">
                  <SelectValue placeholder="Toutes les cibles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les cibles</SelectItem>
                  {TARGET_OPTIONS.filter(o => o.value).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Utilisateur</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="ID ou nom..."
                  value={userFilter}
                  onChange={(e) => { setUserFilter(e.target.value); setPage(1) }}
                  className="h-9 text-xs bg-secondary pl-8"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Date début</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                className="h-9 text-xs bg-secondary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Date fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                className="h-9 text-xs bg-secondary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun log d&apos;audit trouvé</p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-emerald-400 hover:text-emerald-300 mt-2"
                >
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider w-[180px]">Horodatage</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Utilisateur</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Action</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Cible</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">IP</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {logs.map((log) => {
                    const category = getActionCategory(log.action)
                    const isExpanded = expandedRow === log.id

                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/50 border-b transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      >
                        {/* Timestamp */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
                            </span>
                          </div>
                        </TableCell>

                        {/* User */}
                        <TableCell className="py-3">
                          <div>
                            <p className="text-xs font-medium truncate max-w-[140px]">
                              {log.user?.name || 'Inconnu'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                              {log.user?.email || ''}
                            </p>
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 ${actionBadgeVariant(category)}`}
                          >
                            {formatActionLabel(log.action)}
                          </Badge>
                        </TableCell>

                        {/* Target */}
                        <TableCell className="py-3">
                          <span className="text-xs text-muted-foreground">
                            {log.target || '—'}
                          </span>
                        </TableCell>

                        {/* IP */}
                        <TableCell className="py-3">
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.ip || '—'}
                          </span>
                        </TableCell>

                        {/* Expand Toggle */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1">
                            {log.metadata && log.metadata !== '{}' && log.metadata !== '""' && (
                              <Eye className="w-3 h-3 text-muted-foreground" />
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}

          {/* Expanded Row Detail */}
          <AnimatePresence>
            {expandedRow && (() => {
              const log = logs.find(l => l.id === expandedRow)
              if (!log) return null
              return (
                <motion.div
                  key={`detail-${expandedRow}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t bg-secondary/20 overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-medium">Détails de l&apos;entrée</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ID</p>
                        <p className="text-xs font-mono text-muted-foreground">{log.id}</p>
                      </div>
                      {log.targetId && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ID Cible</p>
                          <p className="text-xs font-mono text-muted-foreground">{log.targetId}</p>
                        </div>
                      )}
                      {log.userAgent && (
                        <div className="sm:col-span-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">User Agent</p>
                          <p className="text-xs text-muted-foreground truncate">{log.userAgent}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Métadonnées</p>
                      <MetadataViewer metadata={log.metadata} />
                    </div>
                  </div>
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} sur {totalPages} · {total} résultat{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {getPageNumbers().map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(p)}
                className={`h-8 w-8 p-0 text-xs ${
                  p === page
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : ''
                }`}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={!canNext}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
