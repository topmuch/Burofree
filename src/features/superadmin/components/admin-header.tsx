/**
 * Admin Header — Top bar for the Superadmin panel.
 * Shows current section, breadcrumb, and admin user info.
 */

'use client'

import { Menu, Shield, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

type AdminTab = 'dashboard' | 'users' | 'subscriptions' | 'config' | 'flags' | 'audit' | 'tickets'

const tabTitles: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de la plateforme' },
  users: { title: 'Gestion utilisateurs', subtitle: 'Recherche, filtres et actions en masse' },
  subscriptions: { title: 'Abonnements & Facturation', subtitle: 'Gestion Stripe et rapports financiers' },
  config: { title: 'Configuration globale', subtitle: 'Paramètres plateforme et maintenance' },
  flags: { title: 'Feature Flags', subtitle: 'Activation progressive des fonctionnalités' },
  audit: { title: 'Journal d\'audit', subtitle: 'Historique complet des actions admin' },
  tickets: { title: 'Tickets support', subtitle: 'Gestion des demandes utilisateur' },
}

interface AdminHeaderProps {
  activeTab: AdminTab
}

export function AdminHeader({ activeTab }: AdminHeaderProps) {
  const [refreshing, setRefreshing] = useState(false)
  const info = tabTitles[activeTab]

  const handleRefresh = () => {
    setRefreshing(true)
    // Force a full page refresh to reload data
    window.location.reload()
  }

  return (
    <header className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3 bg-zinc-950/80 backdrop-blur-sm flex-shrink-0">
      {/* Mobile menu button (placeholder — mobile nav not implemented) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 text-zinc-400 hover:text-zinc-200"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Section info */}
      <div className="min-w-0">
        <h1 className="font-semibold text-sm text-zinc-100 leading-none">{info.title}</h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">{info.subtitle}</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
        onClick={handleRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>

      {/* Admin badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
        <Shield className="w-3.5 h-3.5 text-red-400" />
        <span className="text-xs text-red-400 font-medium">Superadmin</span>
      </div>
    </header>
  )
}
