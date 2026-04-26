'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type TabType } from '@/lib/store'
import { SidebarNav } from '@/components/sidebar-nav'
import { Dashboard } from '@/components/dashboard'
import { CalendarView } from '@/components/calendar-view'
import { TaskBoard } from '@/components/task-board'
import { EmailInbox } from '@/components/email-inbox'
import { RemindersPanel } from '@/components/reminders-panel'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

const tabComponents: Record<TabType, React.ComponentType> = {
  dashboard: Dashboard,
  calendar: CalendarView,
  tasks: TaskBoard,
  emails: EmailInbox,
  reminders: RemindersPanel,
}

const tabTitles: Record<TabType, string> = {
  dashboard: 'Tableau de bord',
  calendar: 'Calendrier',
  tasks: 'Tâches',
  emails: 'Emails',
  reminders: 'Rappels',
}

export default function HomePage() {
  const { activeTab, sidebarOpen, toggleSidebar, fetchTasks, fetchEvents, fetchReminders, fetchEmails, fetchEmailAccounts, fetchStats } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.all([
          fetchTasks(),
          fetchEvents(),
          fetchReminders(),
          fetchEmails(),
          fetchEmailAccounts(),
          fetchStats(),
        ])
      } catch (error) {
        console.error('Error initializing data:', error)
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [fetchTasks, fetchEvents, fetchReminders, fetchEmails, fetchEmailAccounts, fetchStats])

  // Close mobile menu when changing tabs
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [activeTab])

  const ActiveComponent = tabComponents[activeTab]

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto animate-pulse">
            <span className="text-primary-foreground font-bold text-lg">FF</span>
          </div>
          <p className="text-sm text-muted-foreground">Chargement de FreeFlow...</p>
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
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
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
        <header className="h-14 border-b flex items-center px-4 gap-3 bg-card/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="md:hidden w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">FF</span>
            </div>
            <h2 className="font-semibold text-sm">{tabTitles[activeTab]}</h2>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
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
    </div>
  )
}
