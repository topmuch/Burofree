'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  DollarSign,
  TrendingUp,
  BarChart3,
  Target,
  CheckCircle2,
  Download,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Briefcase,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

type AnalyticsRange = 'week' | 'month' | 'year'

interface AnalyticsData {
  range: string
  hoursWorked: number
  hoursBillable: number
  revenue: number
  revenueForecast: number
  conversionRate: number
  timeByProject: {
    projectId: string | null
    projectName: string
    projectColor: string
    totalHours: number
    billableHours: number
    revenue: number
  }[]
  completionRate: number
  workload: {
    today: number
    thisWeek: number
    tasksByDay: { day: string; count: number }[]
  }
  monthlyRevenue: { month: string; revenue: number; forecast: number }[]
  topClients: { clientName: string; revenue: number; projectCount: number }[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

const rangeLabels: Record<AnalyticsRange, string> = {
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
}

// ─── Skeleton Loaders ───────────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[260px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip for Revenue Chart ───────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-sm rounded-lg px-4 py-3 text-xs shadow-xl">
        <p className="text-zinc-300 font-medium mb-2">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 py-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-zinc-400">{item.name}:</span>
            <span className="font-semibold text-zinc-100">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ─── Custom Tooltip for Workload Chart ──────────────────────────────────────

function WorkloadTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-sm rounded-lg px-4 py-3 text-xs shadow-xl">
        <p className="text-zinc-300 font-medium mb-1">{label}</p>
        <p className="text-emerald-400 font-semibold">
          {payload[0].value}h travaillées
        </p>
      </div>
    )
  }
  return null
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: string
  icon: React.ElementType
  accentColor: string
  bgColor: string
  sublabel?: string
  trend?: 'up' | 'down' | null
  trendValue?: string
  delay?: number
}

function KPICard({
  label,
  value,
  icon: Icon,
  accentColor,
  bgColor,
  sublabel,
  trend,
  trendValue,
  delay = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                {label}
              </p>
              <p className="text-xl font-bold tracking-tight">{value}</p>
              {sublabel && (
                <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
              )}
              {trend && trendValue && (
                <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${
                  trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {trend === 'up' ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {trendValue}
                </div>
              )}
            </div>
            <div
              className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0 
                group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className={`w-5 h-5 ${accentColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AnalyticsPanel() {
  const [range, setRange] = useState<AnalyticsRange>('month')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const { stats } = useAppStore()

  // ─── Fetch analytics data ───────────────────────────────────────────────

  const fetchAnalytics = async (r: AnalyticsRange) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/overview?range=${r}`)
      if (res.ok) {
        const json = await res.json()
        setData(json as AnalyticsData)
      } else {
        toast.error('Erreur lors du chargement des analytics')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(range)
  }, [range])

  // ─── Export handler ─────────────────────────────────────────────────────

  const handleExport = (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      window.open(`/api/analytics/export?format=${format}&range=${range}`, '_blank')
      toast.success(`Export ${format.toUpperCase()} en cours...`)
    } catch {
      toast.error("Erreur lors de l'export")
    } finally {
      setTimeout(() => setExporting(null), 1500)
    }
  }

  // ─── Derived chart data ─────────────────────────────────────────────────

  const revenueChartData = useMemo(() => {
    if (!data?.monthlyRevenue?.length) {
      // Fallback mock data
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin']
      return months.map(m => ({ month: m, revenue: 0, forecast: 0 }))
    }
    return data.monthlyRevenue
  }, [data])

  const workloadChartData = useMemo(() => {
    if (!data?.workload?.tasksByDay?.length) {
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
      return days.map(d => ({ day: d, heures: 0 }))
    }
    return data.workload.tasksByDay.map(d => ({
      day: d.day,
      heures: d.count,
    }))
  }, [data])

  // ─── KPI definitions ────────────────────────────────────────────────────

  const kpiCards: KPICardProps[] = useMemo(() => {
    if (!data) return []
    return [
      {
        label: 'Heures travaillées',
        value: `${data.hoursWorked}h`,
        icon: Clock,
        accentColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        sublabel: data.workload ? `${data.workload.thisWeek}h cette semaine` : undefined,
        delay: 0,
      },
      {
        label: 'Heures facturables',
        value: `${data.hoursBillable}h`,
        icon: DollarSign,
        accentColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        sublabel: data.hoursWorked > 0
          ? `${Math.round((data.hoursBillable / data.hoursWorked) * 100)}% du total`
          : undefined,
        trend: data.hoursBillable > 0 ? 'up' : null,
        delay: 0.05,
      },
      {
        label: 'CA réalisé',
        value: formatCurrency(data.revenue),
        icon: TrendingUp,
        accentColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        trend: data.revenue > 0 ? 'up' : null,
        trendValue: data.revenue > 0 ? `${formatPercent(data.revenueForecast > 0 ? (data.revenue / (data.revenue + data.revenueForecast)) * 100 : 0)} du prév.` : undefined,
        delay: 0.1,
      },
      {
        label: 'CA prévisionnel',
        value: formatCurrency(data.revenueForecast),
        icon: BarChart3,
        accentColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        sublabel: 'Devis & factures en attente',
        delay: 0.15,
      },
      {
        label: 'Devis → Facture',
        value: formatPercent(data.conversionRate),
        icon: Target,
        accentColor: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        trend: data.conversionRate >= 50 ? 'up' : data.conversionRate > 0 ? 'down' : null,
        trendValue: data.conversionRate > 0
          ? data.conversionRate >= 50 ? 'Bon taux' : 'À améliorer'
          : undefined,
        delay: 0.2,
      },
      {
        label: 'Complétion tâches',
        value: formatPercent(data.completionRate),
        icon: CheckCircle2,
        accentColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        trend: data.completionRate >= 70 ? 'up' : data.completionRate > 0 ? 'down' : null,
        trendValue: data.completionRate >= 70 ? 'Excellent' : data.completionRate > 0 ? 'En cours' : undefined,
        delay: 0.25,
      },
    ]
  }, [data])

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ═══ Header: Range Selector + Export ═══════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Rapports & Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d&apos;ensemble de votre activité — {rangeLabels[range]}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Range Tabs */}
          <Tabs value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
            <TabsList className="bg-secondary/80">
              <TabsTrigger value="week" className="text-xs px-3">Semaine</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3">Mois</TabsTrigger>
              <TabsTrigger value="year" className="text-xs px-3">Année</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-border/60 text-muted-foreground hover:text-foreground hover:border-emerald-500/40 text-xs"
              onClick={() => handleExport('csv')}
              disabled={!!exporting}
            >
              {exporting === 'csv' ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              )}
              Exporter CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-border/60 text-muted-foreground hover:text-foreground hover:border-emerald-500/40 text-xs"
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
            >
              {exporting === 'pdf' ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 mr-1.5" />
              )}
              Exporter PDF
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ KPI Cards Row ═════════════════════════════════════════════════ */}
      {loading ? (
        <KPISkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}

      {/* ═══ Charts Section (2 columns) ════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── Revenue Chart (Area) ─────────────────────────────────────── */}
        {loading ? (
          <ChartSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Revenus mensuels
                  </CardTitle>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Réalisé
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Prévisionnel
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}€`}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                      name="Réalisé"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      fillOpacity={1}
                      fill="url(#forecastGradient)"
                      name="Prévisionnel"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Workload Chart (Bar) ─────────────────────────────────────── */}
        {loading ? (
          <ChartSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Charge de travail
                  <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-400 ml-1">
                    {data?.workload?.today || 0}h aujourd&apos;hui
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={workloadChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}h`}
                    />
                    <Tooltip content={<WorkloadTooltip />} />
                    <Bar
                      dataKey="heures"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      name="Heures"
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ═══ Bottom Section: Project Breakdown + Top Clients ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ─── Project Breakdown Table (3 cols) ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="lg:col-span-3"
        >
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                Répartition par projet
                <Badge variant="outline" className="text-[10px] h-5 border-border/60 ml-1">
                  {data?.timeByProject?.length || 0} projets
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {loading ? (
                <div className="px-6 pb-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-12 ml-auto" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-2 w-24" />
                    </div>
                  ))}
                </div>
              ) : data?.timeByProject && data.timeByProject.length > 0 ? (
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px]">Projet</TableHead>
                        <TableHead className="text-[11px] text-right">Heures</TableHead>
                        <TableHead className="text-[11px] text-right">Facturables</TableHead>
                        <TableHead className="text-[11px] text-right">Revenu</TableHead>
                        <TableHead className="text-[11px] w-[120px]">Ratio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {data.timeByProject.map((proj, idx) => {
                          const billableRatio = proj.totalHours > 0
                            ? Math.round((proj.billableHours / proj.totalHours) * 100)
                            : 0

                          return (
                            <motion.tr
                              key={proj.projectId || idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="hover:bg-muted/50 border-b border-border/30 transition-colors"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-background"
                                    style={{ backgroundColor: proj.projectColor }}
                                  />
                                  <span className="text-sm font-medium truncate max-w-[140px]">
                                    {proj.projectName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {proj.totalHours}h
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums text-emerald-400">
                                {proj.billableHours}h
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium tabular-nums text-emerald-400">
                                {formatCurrency(proj.revenue)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-emerald-500 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${billableRatio}%` }}
                                      transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground tabular-nums min-w-[28px] text-right">
                                    {billableRatio}%
                                  </span>
                                </div>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Briefcase className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Aucune donnée projet</p>
                  <p className="text-xs mt-1">Les données apparaîtront avec vos entrées de temps</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Top Clients (2 cols) ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Top clients
                <Badge variant="outline" className="text-[10px] h-5 border-border/60 ml-1">
                  {data?.topClients?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16 mt-1" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : data?.topClients && data.topClients.length > 0 ? (
                <div className="space-y-1 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {data.topClients.map((client, idx) => {
                    const maxRevenue = data.topClients[0]?.revenue || 1
                    const barWidth = Math.max((client.revenue / maxRevenue) * 100, 2)

                    return (
                      <motion.div
                        key={client.clientName}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="group flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors relative"
                      >
                        {/* Background bar indicator */}
                        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                          <motion.div
                            className="h-full bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
                          />
                        </div>

                        {/* Rank */}
                        <div className="relative z-10 w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                          {idx + 1}
                        </div>

                        {/* Client info */}
                        <div className="relative z-10 flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.clientName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5" />
                              {client.projectCount} projet{client.projectCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Revenue */}
                        <div className="relative z-10 text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-emerald-400 tabular-nums">
                            {formatCurrency(client.revenue)}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Aucun client</p>
                  <p className="text-xs mt-1">Vos meilleurs clients apparaîtront ici</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══ Summary Banner ═════════════════════════════════════════════════ */}
      {!loading && data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-emerald-500/5 via-transparent to-amber-500/5 border-emerald-500/20">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Total heures
                  </p>
                  <p className="text-lg font-bold">{data.hoursWorked}h</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Taux facturable
                  </p>
                  <p className="text-lg font-bold text-emerald-400">
                    {data.hoursWorked > 0
                      ? formatPercent((data.hoursBillable / data.hoursWorked) * 100)
                      : '0%'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    CA + Prévisionnel
                  </p>
                  <p className="text-lg font-bold text-amber-400">
                    {formatCurrency(data.revenue + data.revenueForecast)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Projets actifs
                  </p>
                  <p className="text-lg font-bold">
                    {data.timeByProject.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
