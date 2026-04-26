'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Calendar, Mail, FolderOpen,
  Receipt, Clock, Bell, Settings, ChevronLeft, ChevronRight,
  Bot, Sparkles
} from 'lucide-react'
import { useAppStore, TabType } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

const navItems: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tâches & Projets', icon: CheckSquare },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'invoices', label: 'Facturation', icon: Receipt },
  { id: 'time', label: 'Temps', icon: Clock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

export function SidebarNav() {
  const { activeTab, setActiveTab, sidebarOpen, toggleSidebar, focusMode, setFocusMode, notifications, emails } = useAppStore()
  
  const unreadNotifications = notifications.filter(n => !n.isRead).length
  const unreadEmails = emails.filter(e => !e.isRead && !e.isSent).length

  return (
    <motion.aside
      className={cn(
        'h-screen flex flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] sidebar-transition flex-shrink-0',
        sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--sidebar-border)]">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-lg font-bold tracking-tight"
            >
              <span className="text-emerald-400">Mae</span>
              <span className="text-foreground">llis</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const badge = item.id === 'notifications' ? unreadNotifications : item.id === 'emails' ? unreadEmails : 0
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all relative',
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[var(--sidebar-accent)]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-emerald-400 rounded-r-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-emerald-400')} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 text-left whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {badge > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] text-[10px] px-1.5 flex-shrink-0">
                  {badge}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>

      <Separator className="bg-[var(--sidebar-border)]" />

      {/* Focus Mode Toggle */}
      <div className="px-4 py-3">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <Bot className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between flex-1"
              >
                <span className="text-xs text-muted-foreground">Mode Focus</span>
                <Switch
                  checked={focusMode}
                  onCheckedChange={setFocusMode}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-emerald-400">AM</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">Alex Martin</p>
                <p className="text-xs text-muted-foreground truncate">Développeur Web</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-background shadow-md hover:bg-emerald-500/10 z-10"
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </Button>
    </motion.aside>
  )
}
