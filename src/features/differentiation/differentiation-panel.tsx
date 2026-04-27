'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Store, Globe, Puzzle, Settings } from 'lucide-react'
import { MarketplacePanel } from '@/features/differentiation/marketplace/marketplace-panel'
import { InviteManager } from '@/features/differentiation/portal/invite-manager'
import { IntegrationManager } from '@/features/differentiation/integrations/integration-manager'

type DifferentiationTab = 'marketplace' | 'portal' | 'integrations'

const tabs: { id: DifferentiationTab; label: string; icon: React.ElementType }[] = [
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'portal', label: 'Portail Client', icon: Globe },
  { id: 'integrations', label: 'Intégrations', icon: Puzzle },
]

export function DifferentiationPanel() {
  const [activeTab, setActiveTab] = useState<DifferentiationTab>('marketplace')

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'marketplace' && <MarketplacePanel />}
          {activeTab === 'portal' && <InviteManager />}
          {activeTab === 'integrations' && <IntegrationManager />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
