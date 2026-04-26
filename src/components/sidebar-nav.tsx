'use client'

import { useAppStore, type TabType } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Mail,
  Bell,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navItems: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'tasks', label: 'Tâches', icon: CheckSquare },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'reminders', label: 'Rappels', icon: Bell },
]

export function SidebarNav() {
  const { activeTab, setActiveTab, sidebarOpen, toggleSidebar, stats } = useAppStore()

  const unreadCount = stats?.unreadEmails || 0
  const pendingReminders = stats?.pendingReminders || 0

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 256 : 72 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sidebar-transition relative"
    >
      {/* Logo / Brand */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">FF</span>
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 font-semibold text-sidebar-foreground text-lg"
            >
              FreeFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon
          const showBadge =
            (item.id === 'emails' && unreadCount > 0) ||
            (item.id === 'reminders' && pendingReminders > 0)

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-foreground')} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {showBadge && !isActive && (
                <span
                  className={cn(
                    'flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
                    sidebarOpen ? 'ml-auto' : 'absolute -top-1 -right-1',
                    item.id === 'emails'
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-white'
                  )}
                >
                  {item.id === 'emails' ? unreadCount : pendingReminders}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">Alex Martin</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">alex@freelance.dev</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  )
}
