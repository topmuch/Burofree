/**
 * Admin Sidebar — Isolated navigation for the Superadmin panel.
 * Completely separate from the main app's SidebarNav.
 */

'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Flag,
  FileText,
  LifeBuoy,
  Shield,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export type AdminTab = 'dashboard' | 'users' | 'subscriptions' | 'config' | 'flags' | 'audit' | 'tickets'

interface AdminSidebarProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
}

const navItems: Array<{
  id: AdminTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, description: 'KPIs & métriques' },
  { id: 'users', label: 'Utilisateurs', icon: Users, description: 'Gestion & équipes' },
  { id: 'subscriptions', label: 'Abonnements', icon: CreditCard, description: 'Stripe & facturation' },
  { id: 'config', label: 'Configuration', icon: Settings, description: 'Paramètres globaux' },
  { id: 'flags', label: 'Feature Flags', icon: Flag, description: 'Rollout progressif' },
  { id: 'audit', label: 'Audit', icon: FileText, description: 'Journal d\'actions' },
  { id: 'tickets', label: 'Tickets', icon: LifeBuoy, description: 'Support' },
]

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const router = useRouter()

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo / Branding */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100 leading-none">Burofree</p>
            <p className="text-[10px] text-red-400 font-medium uppercase tracking-wider">Superadmin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                isActive
                  ? 'bg-red-500/10 text-red-400 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-red-400' : 'text-zinc-500')} />
              <div className="min-w-0">
                <p className="leading-none">{item.label}</p>
                {isActive && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">{item.description}</p>
                )}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Back to App */}
      <div className="p-3 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-zinc-400 hover:text-zinc-200"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'app
        </Button>
      </div>

      {/* Security Notice */}
      <div className="p-3 border-t border-zinc-800">
        <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <p className="text-[10px] text-amber-400/80">
            Toutes les actions sont enregistrées dans le journal d'audit.
          </p>
        </div>
      </div>
    </aside>
  )
}
