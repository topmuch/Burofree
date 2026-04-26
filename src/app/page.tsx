'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore, type TabType } from '@/lib/store'
import { SidebarNav } from '@/components/sidebar-nav'
import { AiAssistant } from '@/components/ai-assistant'
import { Dashboard } from '@/components/dashboard'
import { TaskBoard } from '@/components/task-board'
import { CalendarView } from '@/components/calendar-view'
import { EmailInbox } from '@/components/email-inbox'
import { DocumentsPanel } from '@/components/documents-panel'
import { InvoicingPanel } from '@/components/invoicing-panel'
import { TimeTracker } from '@/components/time-tracker'
import { NotificationsPanel } from '@/components/notifications-panel'
import { SettingsPanel } from '@/components/settings-panel'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { Menu, Bell, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const tabComponents: Record<TabType, React.ComponentType> = {
  dashboard: Dashboard,
  tasks: TaskBoard,
  calendar: CalendarView,
  emails: EmailInbox,
  documents: DocumentsPanel,
  invoices: InvoicingPanel,
  time: TimeTracker,
  notifications: NotificationsPanel,
  settings: SettingsPanel,
}

const tabTitles: Record<TabType, string> = {
  dashboard: 'Tableau de bord',
  tasks: 'Tâches & Projets',
  calendar: 'Calendrier',
  emails: 'Emails',
  documents: 'Documents',
  invoices: 'Facturation',
  time: 'Temps',
  notifications: 'Notifications',
  settings: 'Paramètres',
}

export default function HomePage() {
  const {
    activeTab, focusMode, notifications, user, fetchAll, isLoading, fetchReminders, fetchUser
  } = useAppStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const unreadNotifications = notifications.filter(n => !n.isRead).length

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Initialize data on mount
  useEffect(() => {
    const initData = async () => {
      try {
        // Fetch user first to check onboarding status
        await fetchUser()
      } catch (error) {
        console.error('Erreur lors du chargement des données :', error)
      }
    }
    initData()
  }, [fetchUser])

  // After user is fetched, check onboarding and fetch other data
  useEffect(() => {
    if (user !== undefined && user !== null) {
      if (!user.onboardingDone) {
        setShowOnboarding(true)
        setLoading(false)
      } else {
        const loadAll = async () => {
          try {
            await fetchAll()
          } catch (error) {
            console.error('Erreur lors du chargement des données :', error)
          } finally {
            setLoading(false)
          }
        }
        loadAll()
      }
    } else if (user === null && !isLoading) {
      // User was fetched but not found — still load everything
      const loadAll = async () => {
        try {
          await fetchAll()
        } catch (error) {
          console.error('Erreur lors du chargement des données :', error)
        } finally {
          setLoading(false)
        }
      }
      loadAll()
    }
  }, [user, fetchAll, fetchUser, isLoading])

  // Reminder checking interval
  useEffect(() => {
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

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false)
    await fetchUser()
    await fetchAll()
  }, [fetchUser, fetchAll])

  const ActiveComponent = tabComponents[activeTab]

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
            <span className="text-2xl font-bold text-emerald-400">M</span>
          </motion.div>
          <p className="text-sm text-zinc-400">Chargement de Maellis...</p>
        </div>
      </div>
    )
  }

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
            <span className="text-sm font-bold text-emerald-400">M</span>
          </div>

          {/* Tab title */}
          <h2 className="font-semibold text-sm text-zinc-200">{tabTitles[activeTab]}</h2>

          {/* Spacer */}
          <div className="flex-1" />

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
    </div>
  )
}
