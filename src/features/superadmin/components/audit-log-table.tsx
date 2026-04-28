'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  adminEmail: string
  action: string
  target: string | null
  targetId: string | null
  ip: string | null
  metadata: string | null // JSON string
}

interface AuditLogResponse {
  logs: AuditLogEntry[]
  nextCursor: string | null
  hasMore: boolean
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function severityFromAction(action: string): 'low' | 'medium' | 'high' | 'critical' {
  const critical = ['anonymize', 'delete', 'impersonate', 'maintenance_mode']
  const high = ['suspend', 'reset_2fa', 'cancel', 'force_logout', 'bulk_action']
  const medium = ['unsuspend', 'reactivate', 'free_month', 'apply_credit', 'config_update', 'feature_flag_update']
  if (critical.some((k) => action.includes(k))) return 'critical'
  if (high.some((k) => action.includes(k))) return 'high'
  if (medium.some((k) => action.includes(k))) return 'medium'
  return 'low'
}

const SEVERITY_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  low: {
    dot: 'bg-zinc-400',
    badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    label: 'Info',
  },
  medium: {
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    label: 'Modéré',
  },
  high: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    label: 'Élevé',
  },
  critical: {
    dot: 'bg-red-400',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    label: 'Critique',
  },
}

function parseJsonSafe(str: string | null): unknown {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const loaderRef = useRef<HTMLDivElement>(null)

  /* ── Fetch Logs ──────────────────────────────────────────────────────────── */

  const fetchLogs = useCallback(async (loadMore = false) => {
    try {
      if (!loadMore) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams()
      params.set('limit', '50')
      if (loadMore && cursor) params.set('cursor', cursor)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/superadmin/audit-logs?${params.toString()}`)
      if (res.ok) {
        const json: AuditLogResponse = await res.json()
        if (loadMore) {
          setLogs((prev) => [...prev, ...json.logs])
        } else {
          setLogs(json.logs)
        }
        setCursor(json.nextCursor)
        setHasMore(json.hasMore)
      }
    } catch (err) {
      console.error('Erreur chargement audit logs :', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor, actionFilter, dateFrom, dateTo])

  useEffect(() => {
    setCursor(null)
    setLogs([])
    setExpandedId(null)
    fetchLogs(false)
  }, [actionFilter, dateFrom, dateTo])

  /* ── Infinite Scroll ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchLogs(true)
        }
      },
      { rootMargin: '200px' },
    )

    const el = loaderRef.current
    if (el) observer.observe(el)
    return () => {
      if (el) observer.unobserve(el)
    }
  }, [hasMore, loadingMore, fetchLogs])

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="size-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-zinc-100">Journal d&apos;audit</h2>
      </div>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Type d&apos;action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="user">Gestion utilisateurs</SelectItem>
                  <SelectItem value="subscription">Abonnements</SelectItem>
                  <SelectItem value="impersonate">Impersonation</SelectItem>
                  <SelectItem value="config">Configuration</SelectItem>
                  <SelectItem value="feature_flag">Feature flags</SelectItem>
                  <SelectItem value="ticket">Tickets support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Du</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Au</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">Aucune entrée dans le journal d&apos;audit</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500 w-2" />
                  <TableHead className="text-zinc-500">Horodatage</TableHead>
                  <TableHead className="text-zinc-500">Admin</TableHead>
                  <TableHead className="text-zinc-500">Action</TableHead>
                  <TableHead className="text-zinc-500">Cible</TableHead>
                  <TableHead className="text-zinc-500">IP</TableHead>
                  <TableHead className="text-zinc-500">Sévérité</TableHead>
                  <TableHead className="text-zinc-500 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const severity = severityFromAction(log.action)
                  const style = SEVERITY_STYLES[severity]
                  const isExpanded = expandedId === log.id
                  const parsedMeta = parseJsonSafe(log.metadata)

                  return (
                    <tbody key={log.id}>
                      <TableRow
                        className="border-zinc-800 hover:bg-zinc-800/40 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <TableCell>
                          <span className={`inline-block size-2 rounded-full ${style.dot}`} />
                        </TableCell>
                        <TableCell className="text-xs text-zinc-400">
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-200">
                          {log.adminEmail}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                            {log.action}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-400">
                          {log.target
                            ? `${log.target}${log.targetId ? ` #${log.targetId.slice(0, 8)}` : ''}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 font-mono">
                          {log.ip || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={style.badge} variant="outline">
                            {style.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="size-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="size-4 text-zinc-500" />
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Metadata */}
                      <AnimatePresence>
                        {isExpanded && parsedMeta !== null && (
                          <motion.tr
                            initial={{ opacity: 0, maxHeight: 0 }}
                            animate={{ opacity: 1, maxHeight: 300 }}
                            exit={{ opacity: 0, maxHeight: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-zinc-800"
                          >
                            <td colSpan={8} className="bg-zinc-950 p-4">
                              <div className="space-y-2">
                                <p className="text-xs text-zinc-500 font-medium">Métadonnées</p>
                                <pre className="text-xs text-zinc-300 bg-zinc-900 rounded-lg p-3 overflow-x-auto max-h-48 font-mono">
                                  {JSON.stringify(parsedMeta, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Infinite Scroll Loader */}
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-4">
          {loadingMore && <Loader2 className="size-5 animate-spin text-emerald-500" />}
        </div>
      )}
    </div>
  )
}
