'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  CreditCard,
  XCircle,
  CheckCircle2,
  Clock,
  Gift,
  DollarSign,
  CalendarPlus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface SubscriptionRow {
  id: string
  userId: string
  userEmail: string
  plan: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  amount: number
  currency: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId: string | null
}

interface SubscriptionSummary {
  totalMRR: number
  activeCount: number
  churnedCount: number
  trialCount: number
  pastDueCount: number
}

interface SubscriptionsResponse {
  subscriptions: SubscriptionRow[]
  summary: SubscriptionSummary
  nextCursor: string | null
  hasMore: boolean
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount / 100)
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  trialing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  past_due: 'bg-red-500/15 text-red-400 border-red-500/30',
  canceled: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  unpaid: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  trialing: 'Essai',
  past_due: 'En retard',
  canceled: 'Annulé',
  unpaid: 'Non payé',
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function SubscriptionsTable() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([])
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  /* Adjustment panel state */
  const [adjustReason, setAdjustReason] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [trialDays, setTrialDays] = useState('7')

  /* ── Fetch Subscriptions ─────────────────────────────────────────────────── */

  const fetchSubs = useCallback(async (loadMore = false) => {
    try {
      if (!loadMore) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams()
      params.set('limit', '25')
      if (loadMore && cursor) params.set('cursor', cursor)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/superadmin/subscriptions?${params.toString()}`)
      if (res.ok) {
        const json: SubscriptionsResponse = await res.json()
        if (loadMore) {
          setSubs((prev) => [...prev, ...json.subscriptions])
        } else {
          setSubs(json.subscriptions)
          setSummary(json.summary)
        }
        setCursor(json.nextCursor)
        setHasMore(json.hasMore)
        if (!loadMore && json.summary) setSummary(json.summary)
      }
    } catch (err) {
      console.error('Erreur chargement abonnements :', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor, statusFilter])

  useEffect(() => {
    setCursor(null)
    setSubs([])
    setExpandedId(null)
    fetchSubs(false)
  }, [statusFilter])

  /* ── Subscription Actions ────────────────────────────────────────────────── */

  const handleAction = async (subId: string, action: string, extra: Record<string, unknown> = {}) => {
    if (!adjustReason.trim()) return
    setActionLoading(`${subId}-${action}`)
    try {
      const res = await fetch(`/api/superadmin/subscriptions/${subId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: adjustReason, ...extra }),
      })
      if (res.ok) {
        setAdjustReason('')
        fetchSubs(false)
      }
    } catch (err) {
      console.error(`Erreur action ${action} :`, err)
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Export CSV ──────────────────────────────────────────────────────────── */

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams()
      params.set('format', 'csv')
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/superadmin/subscriptions/export?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `abonnements_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Erreur export CSV :', err)
    }
  }

  /* ── Columns ─────────────────────────────────────────────────────────────── */

  const columns = useMemo<ColumnDef<SubscriptionRow>[]>(
    () => [
      {
        accessorKey: 'userEmail',
        header: 'Email',
        cell: ({ getValue }) => <span className="text-zinc-200">{getValue() as string}</span>,
      },
      {
        accessorKey: 'plan',
        header: 'Plan',
        cell: ({ getValue }) => (
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30" variant="outline">
            {(getValue() as string).charAt(0).toUpperCase() + (getValue() as string).slice(1)}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ getValue }) => {
          const status = getValue() as string
          return (
            <Badge className={STATUS_STYLES[status] || STATUS_STYLES.canceled} variant="outline">
              {STATUS_LABELS[status] || status}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'amount',
        header: 'Montant',
        cell: ({ row }) => (
          <span className="text-zinc-200 font-mono text-sm">
            {formatCurrency(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'currentPeriodStart',
        header: 'Début',
        cell: ({ getValue }) => (
          <span className="text-zinc-400 text-xs">
            {new Date(getValue() as string).toLocaleDateString('fr-FR')}
          </span>
        ),
      },
      {
        accessorKey: 'currentPeriodEnd',
        header: 'Fin',
        cell: ({ getValue }) => (
          <span className="text-zinc-400 text-xs">
            {new Date(getValue() as string).toLocaleDateString('fr-FR')}
          </span>
        ),
      },
      {
        accessorKey: 'cancelAtPeriodEnd',
        header: 'Annulation fin période',
        cell: ({ getValue }) =>
          getValue() as boolean ? (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30" variant="outline">Oui</Badge>
          ) : (
            <span className="text-zinc-600 text-xs">Non</span>
          ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: subs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">MRR Total</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(summary.totalMRR)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">Actifs</p>
              <p className="text-xl font-bold text-zinc-100">{summary.activeCount}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">Churnés</p>
              <p className="text-xl font-bold text-red-400">{summary.churnedCount}</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">En essai</p>
              <p className="text-xl font-bold text-blue-400">{summary.trialCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-none">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-zinc-300">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="trialing">Essai</SelectItem>
              <SelectItem value="past_due">En retard</SelectItem>
              <SelectItem value="canceled">Annulé</SelectItem>
              <SelectItem value="unpaid">Non payé</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-emerald-400"
          >
            <Download className="mr-2 size-4" />
            Exporter CSV
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
            </div>
          ) : subs.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">Aucun abonnement trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-zinc-800 hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-zinc-500">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                    <TableHead className="text-zinc-500 w-10" />
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const isExpanded = expandedId === row.original.id
                  return (
                    <tbody key={row.id}>
                      <TableRow
                        className="border-zinc-800 hover:bg-zinc-800/40 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="size-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="size-4 text-zinc-500" />
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Adjustment Panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, maxHeight: 0 }}
                            animate={{ opacity: 1, maxHeight: 400 }}
                            exit={{ opacity: 0, maxHeight: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-zinc-800"
                          >
                            <td colSpan={columns.length + 1} className="bg-zinc-950 p-4">
                              <div className="space-y-4">
                                <p className="text-sm font-medium text-zinc-300">
                                  Ajustements manuels — {row.original.userEmail}
                                </p>

                                {/* Reason Input */}
                                <div>
                                  <label className="text-xs text-zinc-500 mb-1 block">Raison (obligatoire)</label>
                                  <Input
                                    placeholder="Raison de l'ajustement..."
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                                  />
                                </div>

                                <Separator className="bg-zinc-800" />

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                  {/* Cancel */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 justify-start"
                                    onClick={() => handleAction(row.original.id, 'cancel')}
                                    disabled={actionLoading === `${row.original.id}-cancel` || !adjustReason.trim()}
                                  >
                                    <XCircle className="mr-1 size-3" /> Annuler
                                  </Button>

                                  {/* Reactivate */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 justify-start"
                                    onClick={() => handleAction(row.original.id, 'reactivate')}
                                    disabled={actionLoading === `${row.original.id}-reactivate` || !adjustReason.trim()}
                                  >
                                    <CheckCircle2 className="mr-1 size-3" /> Réactiver
                                  </Button>

                                  {/* Extend Trial */}
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={90}
                                      value={trialDays}
                                      onChange={(e) => setTrialDays(e.target.value)}
                                      className="bg-zinc-800 border-zinc-700 text-zinc-200 w-14 text-center text-xs h-8"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                      onClick={() => handleAction(row.original.id, 'extend_trial', { trialDays: parseInt(trialDays) || 7 })}
                                      disabled={actionLoading === `${row.original.id}-extend_trial` || !adjustReason.trim()}
                                    >
                                      <Clock className="mr-1 size-3" /> Prolonger
                                    </Button>
                                  </div>

                                  {/* Apply Credit */}
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      placeholder="Crédit €"
                                      value={creditAmount}
                                      onChange={(e) => setCreditAmount(e.target.value)}
                                      className="bg-zinc-800 border-zinc-700 text-zinc-200 w-20 text-center text-xs h-8"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                                      onClick={() => handleAction(row.original.id, 'apply_credit', { creditAmount: parseFloat(creditAmount) || 0 })}
                                      disabled={actionLoading === `${row.original.id}-apply_credit` || !adjustReason.trim()}
                                    >
                                      <DollarSign className="mr-1 size-3" /> Crédit
                                    </Button>
                                  </div>

                                  {/* Free Month */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 justify-start"
                                    onClick={() => handleAction(row.original.id, 'free_month')}
                                    disabled={actionLoading === `${row.original.id}-free_month` || !adjustReason.trim()}
                                  >
                                    <Gift className="mr-1 size-3" /> Mois gratuit
                                  </Button>
                                </div>
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

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchSubs(true)}
            disabled={loadingMore}
            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400"
          >
            {loadingMore ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Charger plus
          </Button>
        </div>
      )}
    </div>
  )
}
