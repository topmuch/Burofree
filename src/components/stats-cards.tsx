'use client'

import { CheckSquare, TrendingUp, Clock, Mail, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'

export function StatsCards() {
  const { stats } = useAppStore()

  const cards = [
    {
      label: 'Tâches aujourd\'hui',
      value: stats?.tasksToday || 0,
      total: stats?.totalTasks || 0,
      icon: CheckSquare,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      progress: stats?.totalTasks ? Math.round(((stats?.completedTasksThisWeek || 0) / stats.totalTasks) * 100) : 0,
    },
    {
      label: 'CA du mois',
      value: `${(stats?.monthlyRevenue || 0).toLocaleString('fr-FR')} €`,
      total: null,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      trend: '+12%',
    },
    {
      label: 'Heures facturées',
      value: stats?.billableHours || 0,
      total: `${stats?.weeklyHours || 0}h cette semaine`,
      icon: Clock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Emails non lus',
      value: stats?.unreadEmails || 0,
      total: null,
      icon: Mail,
      color: stats?.unreadEmails && stats.unreadEmails > 5 ? 'text-red-400' : 'text-amber-400',
      bgColor: stats?.unreadEmails && stats.unreadEmails > 5 ? 'bg-red-500/10' : 'bg-amber-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="bg-card border-border hover:border-emerald-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  {card.total && typeof card.value === 'number' && (
                    <p className="text-xs text-muted-foreground mt-1">{card.progress}% complété</p>
                  )}
                  {card.trend && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {card.trend}
                    </p>
                  )}
                  {card.label === 'Heures facturées' && card.total && (
                    <p className="text-xs text-muted-foreground mt-1">{card.total}</p>
                  )}
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              {card.label === 'Tâches aujourd\'hui' && card.total !== null && typeof card.value === 'number' && stats && (
                <div className="mt-3">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${card.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
