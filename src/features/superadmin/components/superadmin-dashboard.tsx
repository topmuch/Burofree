'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Users,
  UserCheck,
  TrendingDown,
  Ticket,
  Database,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface KPICardData {
  label: string
  value: string
  trend: number | null
  icon: React.ReactNode
  color: string
}

interface PlatformKPIs {
  totalUsers: number
  activeUsers30d: number
  newUsersThisMonth: number
  mrr: number
  arr: number
  churnRate: number
  openTickets: number
  dbSizeMB: number
  activeSubscriptions: number
  trialSubscriptions: number
  pastDueSubscriptions: number
  totalRevenue: number
  monthlyRevenue: Array<{ month: string; revenue: number; newUsers: number }>
  recentErrors: Array<{ timestamp: string; message: string; count: number }>
  systemHealth: {
    db: 'healthy' | 'degraded' | 'down'
    redis: 'healthy' | 'degraded' | 'down'
    storage: 'healthy' | 'degraded' | 'down'
  }
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

function healthColor(status: string): string {
  if (status === 'healthy') return 'bg-emerald-500'
  if (status === 'degraded') return 'bg-amber-500'
  return 'bg-red-500'
}

function healthLabel(status: string): string {
  if (status === 'healthy') return 'Opérationnel'
  if (status === 'degraded') return 'Dégradé'
  return 'Indisponible'
}

const SUB_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function SuperadminDashboard() {
  const [data, setData] = useState<PlatformKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const fetchMetrics = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/superadmin/metrics')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefresh(new Date())
      }
    } catch (err) {
      console.error('Erreur chargement métriques :', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000) // 5 min
    return () => clearInterval(interval)
  }, [fetchMetrics])

  /* ── KPI Cards ─────────────────────────────────────────────────────────── */

  const kpiCards: KPICardData[] = data
    ? [
        {
          label: 'MRR',
          value: formatCurrency(data.mrr),
          trend: data.monthlyRevenue.length >= 2
            ? ((data.monthlyRevenue[data.monthlyRevenue.length - 1].revenue -
                data.monthlyRevenue[data.monthlyRevenue.length - 2].revenue) /
                (data.monthlyRevenue[data.monthlyRevenue.length - 2].revenue || 1)) * 100
            : null,
          icon: <DollarSign className="size-4" />,
          color: 'text-emerald-400',
        },
        {
          label: 'ARR',
          value: formatCurrency(data.arr),
          trend: null,
          icon: <DollarSign className="size-4" />,
          color: 'text-emerald-400',
        },
        {
          label: 'Utilisateurs totaux',
          value: formatNumber(data.totalUsers),
          trend: data.newUsersThisMonth > 0 ? (data.newUsersThisMonth / data.totalUsers) * 100 : null,
          icon: <Users className="size-4" />,
          color: 'text-blue-400',
        },
        {
          label: 'Utilisateurs actifs (30j)',
          value: formatNumber(data.activeUsers30d),
          trend: null,
          icon: <UserCheck className="size-4" />,
          color: 'text-sky-400',
        },
        {
          label: 'Taux de churn',
          value: `${data.churnRate.toFixed(2)}%`,
          trend: data.churnRate > 5 ? -1 : data.churnRate < 3 ? 1 : 0,
          icon: <TrendingDown className="size-4" />,
          color: 'text-red-400',
        },
        {
          label: 'Tickets ouverts',
          value: formatNumber(data.openTickets),
          trend: null,
          icon: <Ticket className="size-4" />,
          color: 'text-amber-400',
        },
        {
          label: 'Taille BDD',
          value: `${formatNumber(data.dbSizeMB)} Mo`,
          trend: null,
          icon: <Database className="size-4" />,
          color: 'text-purple-400',
        },
        {
          label: 'Abonnements actifs',
          value: formatNumber(data.activeSubscriptions),
          trend: null,
          icon: <CreditCard className="size-4" />,
          color: 'text-emerald-400',
        },
      ]
    : []

  /* ── Subscription Pie Data ──────────────────────────────────────────────── */

  const subPieData = data
    ? [
        { name: 'Actifs', value: data.activeSubscriptions },
        { name: 'Essai', value: data.trialSubscriptions },
        { name: 'En retard', value: data.pastDueSubscriptions },
      ]
    : []

  /* ── Render ──────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-zinc-950">
        <RefreshCw className="size-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-zinc-950 text-zinc-400">
        Impossible de charger les métriques.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Tableau de bord Superadmin</h1>
          <p className="text-sm text-zinc-500">
            Dernière actualisation : {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMetrics}
          disabled={refreshing}
          className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400"
        >
          <RefreshCw className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* KPI Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {kpiCards.map((card) => (
          <motion.div key={card.label} variants={itemVariants}>
            <Card className="border-zinc-800 bg-zinc-900 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {card.label}
                </CardTitle>
                <div className={card.color}>{card.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-100">{card.value}</div>
                {card.trend !== null && card.trend !== 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {card.trend > 0 ? (
                      <>
                        <ArrowUpRight className="size-3 text-emerald-400" />
                        <span className="text-emerald-400">+{Math.abs(card.trend).toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="size-3 text-red-400" />
                        <span className="text-red-400">{card.trend.toFixed(1)}%</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardHeader>
              <CardTitle className="text-zinc-100">Revenu mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#f4f4f5' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenu']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5, fill: '#34d399' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* New Users Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardHeader>
              <CardTitle className="text-zinc-100">Nouveaux inscrits</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#f4f4f5' }}
                    formatter={(value: number) => [formatNumber(value), 'Inscrits']}
                  />
                  <Bar dataKey="newUsers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Pie + Health + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Subscription Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardHeader>
              <CardTitle className="text-zinc-100">Répartition abonnements</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={subPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {subPieData.map((_entry, index) => (
                      <Cell key={index} fill={SUB_COLORS[index % SUB_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#f4f4f5' }}
                    formatter={(value: number, name: string) => [formatNumber(value), name]}
                  />
                  <Legend
                    formatter={(value: string) => <span style={{ color: '#a1a1aa', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardHeader>
              <CardTitle className="text-zinc-100">Santé du système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['db', 'redis', 'storage'] as const).map((service) => {
                const status = data.systemHealth[service]
                return (
                  <div key={service} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-block size-3 rounded-full ${healthColor(status)}`} />
                      <span className="text-sm font-medium text-zinc-200 uppercase">
                        {service === 'db' ? 'Base de données' : service === 'redis' ? 'Redis' : 'Stockage'}
                      </span>
                    </div>
                    <Badge
                      className={
                        status === 'healthy'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : status === 'degraded'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }
                      variant="outline"
                    >
                      {healthLabel(status)}
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Errors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-zinc-800 bg-zinc-900 shadow-none">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-400" />
                Erreurs récentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentErrors.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune erreur récente</p>
              ) : (
                <div className="max-h-[220px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500 text-xs">Horodatage</TableHead>
                        <TableHead className="text-zinc-500 text-xs">Message</TableHead>
                        <TableHead className="text-zinc-500 text-xs text-right">Nombre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentErrors.map((err, i) => (
                        <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-xs text-zinc-400">
                            {new Date(err.timestamp).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-xs text-red-300 max-w-[200px] truncate">
                            {err.message}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 text-right">
                            {err.count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
