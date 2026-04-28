/**
 * Superadmin Entry Point — Authentication Gate.
 *
 * This is the first page loaded when navigating to /superadmin.
 * It verifies the user has SUPERADMIN role before rendering the dashboard.
 * If not authenticated or not superadmin, it redirects to the main app.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SuperAdminDashboard from '@/features/superadmin/components/superadmin-dashboard'
import ImpersonationBanner from '@/features/superadmin/components/impersonation-banner'
import { AdminSidebar } from '@/features/superadmin/components/admin-sidebar'
import { AdminHeader } from '@/features/superadmin/components/admin-header'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type AdminTab = 'dashboard' | 'users' | 'subscriptions' | 'config' | 'flags' | 'audit' | 'tickets'

export default function SuperAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  // Impersonation state is managed by the ImpersonationBanner component itself
  // which fetches from /api/superadmin/impersonation/status

  // Check superadmin authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/superadmin/metrics')
        if (res.ok) {
          setAuthorized(true)
        } else if (res.status === 401) {
          setError('Authentification requise. Veuillez vous connecter.')
        } else if (res.status === 403) {
          setError('Accès refusé. Privilèges superadmin requis.')
        } else {
          setError('Erreur lors de la vérification des accès.')
        }
      } catch {
        setError('Impossible de contacter le serveur.')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto"
          >
            <Shield className="w-7 h-7 text-red-400" />
          </motion.div>
          <p className="text-sm text-zinc-400">Vérification des accès superadmin...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Accès non autorisé</h1>
          <p className="text-sm text-zinc-400">{error}</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Retour à l'application
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Impersonation Banner — self-managed via API */}
      <ImpersonationBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader activeTab={activeTab} />

          <main className="flex-1 overflow-y-auto admin-scrollbar p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <TabContent tab={activeTab} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}

function TabContent({ tab }: { tab: AdminTab }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    setComponent(null)
    const loadComponent = async () => {
      let mod: { default: React.ComponentType }
      switch (tab) {
        case 'dashboard':
          mod = await import('@/features/superadmin/components/superadmin-dashboard')
          break
        case 'users':
          mod = await import('@/features/superadmin/components/users-table')
          break
        case 'subscriptions':
          mod = await import('@/features/superadmin/components/subscriptions-table')
          break
        case 'config':
          mod = await import('@/features/superadmin/components/config-panel')
          break
        case 'flags':
          mod = await import('@/features/superadmin/components/feature-flags-panel')
          break
        case 'audit':
          mod = await import('@/features/superadmin/components/audit-log-table')
          break
        case 'tickets':
          mod = await import('@/features/superadmin/components/tickets-panel')
          break
        default:
          mod = await import('@/features/superadmin/components/superadmin-dashboard')
      }
      setComponent(() => mod.default)
    }
    loadComponent()
  }, [tab])

  if (!Component) return <LoadingSkeleton />
  return <Component />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-zinc-900 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-zinc-900 rounded-lg animate-pulse" />
    </div>
  )
}
