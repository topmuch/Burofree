'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore, type TabType } from '@/lib/store'
import { SidebarNav } from '@/components/sidebar-nav'
import { AiAssistant } from '@/components/ai-assistant'
import { GlobalSearch } from '@/components/global-search'
import { Dashboard } from '@/components/dashboard'
import { TaskBoard } from '@/components/task-board'
import { CalendarView } from '@/components/calendar-view'
import { EmailInbox } from '@/components/email-inbox'
import { DocumentsPanel } from '@/components/documents-panel'
import { InvoicingPanel } from '@/components/invoicing-panel'
import { TimeView } from '@/components/time-view'
import { MeetingsPanel } from '@/components/meetings-panel'
import { ContractsPanel } from '@/components/contracts-panel'
import { NotificationsPanel } from '@/components/notifications-panel'
import { SettingsPanel } from '@/components/settings-panel'
import { AnalyticsPanel } from '@/components/analytics-panel'
import { TemplatesPanel } from '@/components/templates-panel'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { Menu, Bell, Eye, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { RealtimeProvider, useRealtimeStatus } from '@/components/realtime-provider'
import { FocusOverlay } from '@/features/differentiation/focus/focus-overlay'
import { VoiceButton } from '@/features/differentiation/voice/voice-button'
import { DifferentiationPanel } from '@/features/differentiation/differentiation-panel'
import { ProductionPanel } from '@/features/production/production-panel'
import { NetworkStatus } from '@/features/production/pwa/network-status'
import { InstallPrompt } from '@/features/production/pwa/install-prompt'
import { SecurityPanel } from '@/features/security/components/security-panel'
import { ConsentBanner } from '@/features/security/components/consent-banner'
import { UnifiedInboxPanel } from '@/features/unified-inbox/unified-inbox-panel'

// Placeholder for tabs without dedicated components yet
function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <p className="text-sm">{title} — bientôt disponible</p>
    </div>
  )
}

const tabComponents: Record<TabType, React.ComponentType> = {
  dashboard: Dashboard,
  tasks: TaskBoard,
  calendar: CalendarView,
  emails: EmailInbox,
  inbox: UnifiedInboxPanel,
  documents: DocumentsPanel,
  invoices: InvoicingPanel,
  contracts: ContractsPanel,
  meetings: MeetingsPanel,
  time: TimeView,
  notifications: NotificationsPanel,
  analytics: AnalyticsPanel,
  templates: TemplatesPanel,
  marketplace: DifferentiationPanel,
  production: ProductionPanel,
  security: SecurityPanel,
  settings: SettingsPanel,
}

const tabTitles: Record<TabType, string> = {
  dashboard: 'Tableau de bord',
  tasks: 'Tâches & Projets',
  calendar: 'Calendrier',
  emails: 'Emails',
  inbox: 'Boîte unifiée',
  documents: 'Documents',
  invoices: 'Facturation',
  contracts: 'Contrats',
  meetings: 'Réunions',
  time: 'Temps',
  notifications: 'Notifications',
  analytics: 'Rapports & Analytics',
  templates: 'Modèles',
  marketplace: 'Extensions',
  production: 'Production',
  security: 'Sécurité & Conformité',
  settings: 'Paramètres',
}

const LOADING_TIMEOUT_MS = 15000 // 15 seconds max on loading screen

/**
 * Inner app content that only renders after data is loaded.
 * Uses useRealtimeStatus() from the RealtimeProvider context
 * instead of creating its own SSE connection.
 */
function AppContent() {
  const {
    activeTab, focusMode, notifications, user, fetchReminders
  } = useAppStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const realtimeStatus = useRealtimeStatus()

  const unreadNotifications = notifications.filter(n => !n.isRead).length

  // Reminder checking interval
  useEffect(() => {
    fetchReminders()
    const interval = setInterval(() => {
      fetchReminders()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchReminders])

  // Close mobile menu when changing tabs
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [activeTab])

  const handleMobileToggle = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  const ActiveComponent = tabComponents[activeTab]

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <SidebarNav />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-0 top-0 z-50 md:hidden"
            >
              <SidebarNav />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3 bg-zinc-950/80 backdrop-blur-sm">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-zinc-400 hover:text-zinc-200"
            onClick={handleMobileToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mobile logo */}
          <div className="md:hidden w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-emerald-400">B</span>
          </div>

          {/* Tab title */}
          <h2 className="font-semibold text-sm text-zinc-200">{tabTitles[activeTab]}</h2>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Real-time connection indicator */}
          {user?.onboardingDone && (
            <div className="flex items-center gap-1">
              {realtimeStatus === 'connected' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : realtimeStatus === 'connecting' ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </div>
          )}

          {/* Focus mode indicator */}
          {focusMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Focus</span>
            </motion.div>
          )}

          {/* Quick notification bell */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-200 relative"
            onClick={() => useAppStore.getState().setActiveTab('notifications')}
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 pulse-emerald" />
            )}
          </Button>
        </header>

        {/* Content Area */}
        <div className={cn(
          'flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6',
          focusMode && 'focus-mode-active'
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* AI Assistant */}
      <AiAssistant />

      {/* Global Search (Cmd/Ctrl+K) */}
      <GlobalSearch />

      {/* Focus Mode Overlay */}
      <FocusOverlay />

      {/* Voice Command Button */}
      <VoiceButton />

      {/* PWA Network Status Banner */}
      <NetworkStatus />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* GDPR Consent Banner */}
      <ConsentBanner />
    </div>
  )
}

export default function HomePage() {
  const { fetchAll, fetchUser } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Register service worker with offline sync support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})

      // Listen for sync messages from service worker
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'SYNC_OFFLINE_ACTIONS') {
          const { getOfflineQueue } = await import('@/features/production/pwa/offline-queue')
          const queue = getOfflineQueue()
          if (navigator.onLine) {
            queue.syncToServer().catch(() => {})
          }
        }
      }

      navigator.serviceWorker.addEventListener('message', handleMessage)

      // Register periodic sync if supported
      navigator.serviceWorker.ready.then((registration) => {
        if ('periodicSync' in registration) {
          (registration as unknown as { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync.register('periodic-email-sync', {
            minInterval: 30 * 60 * 1000,
          }).catch(() => {})
          ;(registration as unknown as { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync.register('periodic-calendar-sync', {
            minInterval: 30 * 60 * 1000,
          }).catch(() => {})
        }
      }).catch(() => {})
    }
  }, [])

  // Loading timeout — force the app to render even if data loading hangs
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached — forcing app to render')
        setLoading(false)
        setLoadError('Délai de chargement dépassé. Certaines données peuvent être indisponibles.')
      }
    }, LOADING_TIMEOUT_MS)

    return () => clearTimeout(timeout)
  }, [loading])

  // Single initialization effect — runs once on mount
  useEffect(() => {
    let cancelled = false

    const initData = async () => {
      try {
        // Step 1: Fetch user to check onboarding status
        await fetchUser()
      } catch (error) {
        console.error('Erreur fetchUser:', error)
      }

      if (cancelled) return

      // After fetchUser, read the latest state from the store
      const currentUser = useAppStore.getState().user

      if (!currentUser) {
        // No user exists in DB — show onboarding to create one
        if (!cancelled) {
          setShowOnboarding(true)
          setLoading(false)
        }
        return
      }

      if (!currentUser.onboardingDone) {
        // User exists but hasn't done onboarding
        if (!cancelled) {
          setShowOnboarding(true)
          setLoading(false)
        }
        return
      }

      // Step 2: Fetch all other data (tasks, events, etc.)
      try {
        await fetchAll()
      } catch (error) {
        console.error('Erreur fetchAll:', error)
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    initData()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false)
    setLoadError(null)
    setLoading(true)
    try {
      await fetchUser()
      await fetchAll()
    } catch (error) {
      console.error('Erreur post-onboarding:', error)
    }
    setLoading(false)
  }, [fetchUser, fetchAll])

  // Onboarding wizard
  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto"
          >
            <span className="text-2xl font-bold text-emerald-400">B</span>
          </motion.div>
          <p className="text-sm text-zinc-400">Chargement de Burofree...</p>
        </div>
      </div>
    )
  }

  // Main app content — wrapped in RealtimeProvider (single SSE connection)
  return (
    <RealtimeProvider>
      {loadError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <p className="text-xs text-amber-400">{loadError}</p>
        </div>
      )}
      <AppContent />
    </RealtimeProvider>
  )
}
