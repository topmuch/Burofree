'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Users, TrendingUp, Clock, Target, DollarSign } from 'lucide-react'
import {
  useAnalyticsOverview,
  useContactStats,
  usePipelineStats,
  useCampaignStats,
} from '@/features/crm/hooks/use-analytics'

type Period = '7d' | '30d' | '90d'

const EMERALD = '#10b981'
const AMBER = '#f59e0b'
const ROSE = '#f43f5e'
const ZINC_400 = '#a1a1aa'
const ZINC_600 = '#52525b'

const PIE_COLORS = [EMERALD, AMBER, '#6366f1', ROSE, '#8b5cf6', '#06b6d4', '#ec4899']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

function KpiCard({ title, value, subtitle, icon: Icon, trend, color }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: number
  color: 'emerald' | 'amber' | 'rose' | 'zinc'
}) {
  const colorClasses = {
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400',
    zinc: 'from-zinc-500/10 to-zinc-500/5 border-zinc-500/20 text-zinc-400',
  }

  const iconBg = {
    emerald: 'bg-emerald-500/20',
    amber: 'bg-amber-500/20',
    rose: 'bg-rose-500/20',
    zinc: 'bg-zinc-500/20',
  }

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-zinc-100">{value}</p>
            {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
            {trend !== undefined && (
              <p className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg ${iconBg[color]} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className={className}>
        {children}
      </CardContent>
    </Card>
  )
}

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  color: '#e4e4e7',
  fontSize: '12px',
}

export function CrmAnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('30d')

  const overview = useAnalyticsOverview(period)
  const contacts = useContactStats(period)
  const pipeline = usePipelineStats(period)
  const campaigns = useCampaignStats(period)

  const isLoading = overview.isLoading || contacts.isLoading || pipeline.isLoading || campaigns.isLoading

  const handleExport = async () => {
    const url = `/api/crm/analytics/export?format=csv&period=${period}&type=overview`
    const res = await fetch(url)
    if (res.ok) {
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `crm-analytics-overview-${period}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg bg-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  const pipelineData = pipeline.data?.stats
  const forecastData = pipeline.data?.forecast

  // Prepare contact lifecycle chart data
  const lifecycleChartData = contacts.data?.byLifecycle.map(l => ({
    name: l.lifecycle.charAt(0).toUpperCase() + l.lifecycle.slice(1),
    count: l.count,
  })) || []

  // Prepare pipeline by stage data
  const pipelineByStageData = pipelineData?.byStage.map(s => ({
    name: s.stageName,
    value: s.value,
    count: s.count,
  })) || []

  // Prepare forecast stacked area data
  const forecastChartData = forecastData?.flatMap(fd =>
    fd.stages.map(s => ({
      pipeline: fd.pipelineName,
      stage: s.stageName,
      value: s.weightedValue,
      totalValue: s.totalValue,
    }))
  ) || []

  // Prepare campaign line chart data
  const campaignLineData = campaigns.data?.overTime.map(d => ({
    date: d.date,
    Envoyés: d.sent,
    Ouverts: d.opened,
    Cliqués: d.clicked,
  })) || []

  // Prepare source pie data
  const sourcePieData = contacts.data?.bySource.map(s => ({
    name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    value: s.count,
  })) || []

  return (
    <div className="space-y-4 p-4">
      {/* Header with period selector and export */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-zinc-100">Tableau de bord CRM</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className={`h-7 text-xs px-3 ${period === p ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => setPeriod(p)}
              >
                {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-700 text-zinc-300" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Contacts"
          value={overview.data?.totalContacts ?? 0}
          icon={Users}
          trend={overview.data?.contactGrowth}
          color="emerald"
          subtitle={`+${contacts.data?.newThisPeriod ?? 0} sur la période`}
        />
        <KpiCard
          title="Deals Actifs"
          value={overview.data?.activeDeals ?? 0}
          icon={Target}
          color="amber"
        />
        <KpiCard
          title="Valeur Pipeline"
          value={formatCurrency(overview.data?.pipelineValue ?? 0)}
          icon={DollarSign}
          color="emerald"
        />
        <KpiCard
          title="Taux de Conversion"
          value={`${overview.data?.winRate ?? 0}%`}
          icon={TrendingUp}
          color={overview.data && overview.data.winRate >= 30 ? 'emerald' : overview.data && overview.data.winRate >= 15 ? 'amber' : 'rose'}
        />
        <KpiCard
          title="Temps Réponse Moy."
          value={overview.data?.avgResponseTime ? `${overview.data.avgResponseTime} min` : 'N/A'}
          icon={Clock}
          color={overview.data && overview.data.avgResponseTime <= 60 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Contacts by Lifecycle */}
        <ChartCard title="Contacts par cycle de vie">
          <div className="h-64">
            {lifecycleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifecycleChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: ZINC_400, fontSize: 11 }} />
                  <YAxis tick={{ fill: ZINC_400, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={EMERALD} radius={[4, 4, 0, 0]} name="Contacts" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Aucune donnée</div>
            )}
          </div>
        </ChartCard>

        {/* Chart 2: Pipeline Value by Stage */}
        <ChartCard title="Valeur du pipeline par étape">
          <div className="h-64">
            {pipelineByStageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineByStageData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" tick={{ fill: ZINC_400, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: ZINC_400, fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" fill={EMERALD} radius={[0, 4, 4, 0]} name="Valeur" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Aucune donnée</div>
            )}
          </div>
        </ChartCard>

        {/* Chart 3: Revenue Forecast */}
        <ChartCard title="Prévisions de revenus (pondéré)">
          <div className="h-64">
            {forecastChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="stage" tick={{ fill: ZINC_400, fontSize: 11 }} />
                  <YAxis tick={{ fill: ZINC_400, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ color: ZINC_400, fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" name="Valeur pondérée" stroke={EMERALD} fill={EMERALD} fillOpacity={0.2} />
                  <Area type="monotone" dataKey="totalValue" name="Valeur totale" stroke={AMBER} fill={AMBER} fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Aucune donnée</div>
            )}
          </div>
        </ChartCard>

        {/* Chart 4: Campaign Performance */}
        <ChartCard title="Performance des campagnes">
          <div className="h-64">
            {campaignLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaignLineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: ZINC_400, fontSize: 10 }} />
                  <YAxis tick={{ fill: ZINC_400, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: ZINC_400, fontSize: 11 }} />
                  <Line type="monotone" dataKey="Envoyés" stroke={ZINC_600} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Ouverts" stroke={EMERALD} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Cliqués" stroke={AMBER} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                {campaigns.data && campaigns.data.totalCampaigns > 0
                  ? 'Données temporelles non disponibles'
                  : 'Aucune campagne'}
              </div>
            )}
          </div>
        </ChartCard>

        {/* Chart 5: Contact Sources Pie */}
        <ChartCard title="Sources des contacts" className="lg:col-span-2">
          <div className="h-64 flex items-center justify-center">
            {sourcePieData.length > 0 ? (
              <div className="flex items-center gap-8 w-full">
                <div className="flex-1 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourcePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sourcePieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 min-w-[140px]">
                  {sourcePieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-xs text-zinc-400">{entry.name}</span>
                      <span className="text-xs text-zinc-300 font-medium ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Aucune donnée</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Pipeline Summary */}
      {pipelineData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500">Valeur gagnée</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(pipelineData.wonValue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500">Valeur en cours</p>
              <p className="text-lg font-bold text-amber-400">{formatCurrency(pipelineData.openValue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500">Valeur perdue</p>
              <p className="text-lg font-bold text-rose-400">{formatCurrency(pipelineData.lostValue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-zinc-500">Temps moyen fermeture</p>
              <p className="text-lg font-bold text-zinc-300">{pipelineData.avgCloseDays} jours</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
