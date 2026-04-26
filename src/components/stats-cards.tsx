'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { CheckSquare, Calendar, Bell, Mail } from 'lucide-react'
import { motion } from 'framer-motion'

const statCards = [
  {
    key: 'tasksDueToday',
    label: 'Tâches dues aujourd\'hui',
    icon: CheckSquare,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    key: 'tasksThisWeek',
    label: 'Tâches cette semaine',
    icon: CheckSquare,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    key: 'upcomingEvents',
    label: 'Événements à venir',
    icon: Calendar,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    key: 'unreadEmails',
    label: 'Emails non lus',
    icon: Mail,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
]

export function StatsCards() {
  const { stats } = useAppStore()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {statCards.map((stat) => {
        const Icon = stat.icon
        const value = stats?.[stat.key as keyof typeof stats] ?? 0
        return (
          <motion.div key={stat.key} variants={item}>
            <Card className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
