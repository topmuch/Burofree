'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Euro,
  Timer,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

// ─── Custom Tooltip ────────────
function ReportBarTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
        <p className="text-zinc-300 font-medium mb-1">{label}</p>
        {payload.map((item: any, idx: number) => (
          <p key={idx} className={item.dataKey === 'billableHours' ? 'text-emerald-400' : 'text-amber-400'}>
            {item.dataKey === 'billableHours' ? 'Facturable' : 'Total'}: {item.value}h
          </p>
        ))}
      </div>
    )
  }
  return null
}

type ReportPeriod = 'week' | 'month' | 'year' | 'custom'

export function TimeReports() {
  const { timeReports, fetchTimeReports, projects, fetchProjects } = useAppStore()

  const [period, setPeriod] = useState<ReportPeriod>('week')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isLoading, setIsLoading] = useState(false)

  // Fetch projects if not loaded
  useEffect(() => {
    if (projects.length === 0) fetchProjects()
  }, [projects.length, fetchProjects])

  // Fetch report data
  const loadReport = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string> = { period }
      if (selectedProjectId !== 'all') params.projectId = selectedProjectId
      if (period === 'custom') {
        params.startDate = customStart
        params.endDate = customEnd
      }
      await fetchTimeReports(params)
    } finally {
      setIsLoading(false)
    }
  }, [period, selectedProjectId, customStart, customEnd, fetchTimeReports])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Export CSV
  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams({ format: 'csv', period })
      if (selectedProjectId !== 'all') params.set('projectId', selectedProjectId)
      if (period === 'custom') {
        params.set('startDate', customStart)
        params.set('endDate', customEnd)
      }
      const res = await fetch(`/api/time-entries/reports?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rapport-temps-${period}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Rapport exporté en CSV')
      }
    } catch {
      toast.error('Échec de l\'export')
    }
  }, [period, selectedProjectId, customStart, customEnd])

  const report = timeReports

  const periodLabels: Record<ReportPeriod, string> = {
    week: 'Cette semaine',
    month: 'Ce mois',
    year: 'Cette année',
    custom: 'Personnalisé',
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Rapports de temps
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Analyse détaillée de votre temps facturable</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ─── Filters ─────────────────── */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 text-sm h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="week" className="text-zinc-300">Cette semaine</SelectItem>
                  <SelectItem value="month" className="text-zinc-300">Ce mois</SelectItem>
                  <SelectItem value="year" className="text-zinc-300">Cette année</SelectItem>
                  <SelectItem value="custom" className="text-zinc-300">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom date range */}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm h-9 rounded-md px-3"
                />
                <span className="text-zinc-600">→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm h-9 rounded-md px-3"
                />
              </div>
            )}

            {/* Project filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 text-sm h-9 w-[180px]">
                  <SelectValue placeholder="Tous les projets" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all" className="text-zinc-300">Tous les projets</SelectItem>
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

            <Button variant="outline" size="sm" className="h-9 border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 ml-auto"
              onClick={loadReport}>
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Summary Cards ─────────────────── */}
      {!report ? (
        <div className="text-center py-12 text-zinc-600 text-sm">
          {isLoading ? 'Chargement du rapport...' : 'Aucune donnée disponible'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <Clock className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="text-2xl font-bold text-zinc-100">{report.totalHours}</p>
                  <p className="text-xs text-zinc-500 mt-1">Heures totales</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <DollarSign className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="text-2xl font-bold text-zinc-100">{report.billableHours}</p>
                  <p className="text-xs text-zinc-500 mt-1">Heures facturables</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <Euro className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="text-2xl font-bold text-zinc-100">{report.revenue}€</p>
                  <p className="text-xs text-zinc-500 mt-1">Revenu</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <TrendingUp className="w-6 h-6 text-amber-400 mb-2" />
                  <p className="text-2xl font-bold text-zinc-100">{report.avgHourlyRate}€/h</p>
                  <p className="text-xs text-zinc-500 mt-1">Taux horaire moyen</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ─── Bar Chart ─────────────────── */}
          {report.aggregation.length > 0 && (
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-300 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Heures par {period === 'week' ? 'jour' : period === 'month' ? 'semaine' : 'mois'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.aggregation} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={35} />
                      <Tooltip content={<ReportBarTooltip />} />
                      <Bar dataKey="totalHours" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Total" />
                      <Bar dataKey="billableHours" fill="#10b981" radius={[3, 3, 0, 0]} name="Facturable" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Project Breakdown ─────────────────── */}
          {report.projectBreakdown.length > 0 && (
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-300 text-sm flex items-center gap-2">
                  <Timer className="w-4 h-4 text-emerald-400" />
                  Répartition par projet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.projectBreakdown.map((proj, idx) => (
                    <motion.div
                      key={proj.projectId || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.projectColor }} />
                          <span className="text-sm text-zinc-300">{proj.projectName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>{proj.totalHours}h total</span>
                          <span className="text-emerald-400">{proj.billableHours}h facturées</span>
                          <span className="text-emerald-400 font-medium">{proj.revenue}€</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={proj.percentage} className="h-2 flex-1" />
                        <span className="text-xs text-zinc-500 min-w-[36px] text-right">{proj.percentage}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Details Table ─────────────────── */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-zinc-300 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Résumé de la période
                </CardTitle>
                <Badge variant="outline" className="text-[10px] h-5 border-zinc-700 text-zinc-400">
                  {report.totalEntries} entrées
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Heures facturables</p>
                  <p className="text-lg font-semibold text-emerald-400">{report.billableHours}h</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Heures non facturables</p>
                  <p className="text-lg font-semibold text-amber-400">{report.nonBillableHours}h</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Ratio facturable</p>
                  <p className="text-lg font-semibold text-zinc-200">
                    {report.totalHours > 0 ? Math.round(report.billableHours / report.totalHours * 100) : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Revenu total</p>
                  <p className="text-lg font-semibold text-emerald-400">{report.revenue}€</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
