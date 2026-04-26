'use client'

import { useState } from 'react'
import { TimeTracker } from '@/components/time-tracker'
import { TimeReports } from '@/components/time-reports'
import { Button } from '@/components/ui/button'
import { Timer, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type TimeView = 'tracker' | 'reports'

export function TimeView() {
  const [activeView, setActiveView] = useState<TimeView>('tracker')

  return (
    <div className="space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900/60 border border-zinc-800 w-fit">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 text-xs gap-1.5 rounded-md',
            activeView === 'tracker'
              ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
          onClick={() => setActiveView('tracker')}
        >
          <Timer className="w-3.5 h-3.5" />
          Suivi
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 text-xs gap-1.5 rounded-md',
            activeView === 'reports'
              ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
          onClick={() => setActiveView('reports')}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Rapports
        </Button>
      </div>

      {/* Active view */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeView === 'tracker' ? <TimeTracker /> : <TimeReports />}
      </motion.div>
    </div>
  )
}
