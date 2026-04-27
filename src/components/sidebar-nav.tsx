'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Calendar, Mail, FolderOpen,
  Receipt, Timer, Bell, Settings, ChevronLeft, ChevronRight,
  Moon, Sun, Sparkles, Video, FileText, BarChart3, LayoutTemplate, Store, Server
} from 'lucide-react'
import { useAppStore, type TabType } from '@/lib/store'
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
  { id: 'contracts', label: 'Contrats', icon: FileText },
  { id: 'meetings', label: 'Réunions', icon: Video },
  { id: 'time', label: 'Temps', icon: Timer },
  { id: 'templates', label: 'Modèles', icon: LayoutTemplate },
  { id: 'marketplace', label: 'Extensions', icon: Store },
  { id: 'production', label: 'Production', icon: Server },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

export function SidebarNav() {
  const {
    activeTab, setActiveTab, sidebarOpen, toggleSidebar,
    focusMode, setFocusMode, notifications, emails, user
  } = useAppStore()

  const unreadNotifications = notifications.filter(n => !n.isRead).length
  const unreadEmails = emails.filter(e => !e.isRead && !e.isSent).length

  const userName = user?.name || 'Alex Martin'
  const userProfession = user?.profession || 'Développeur Web'
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.aside
      className={cn(
        'h-screen flex flex-col bg-zinc-900 border-r border-zinc-800 sidebar-transition flex-shrink-0 relative',
        focusMode && 'focus-mode-active'
      )}
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.span
                key="full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-lg font-bold text-emerald-400"
              >
                B
              </motion.span>
            ) : (
              <motion.span
                key="mini"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-lg font-bold text-emerald-400"
              >
                B
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-lg font-bold tracking-tight text-zinc-100"
            >
              <span className="text-emerald-400">Buro</span>
              <span className="text-zinc-100">free</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const badge = item.id === 'notifications'
            ? unreadNotifications
            : item.id === 'emails'
              ? unreadEmails
              : 0

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 text-sm transition-all relative group',
                sidebarOpen ? 'px-4 py-2.5' : 'px-0 py-2.5 justify-center',
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-emerald-400 rounded-r-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                )}
              />
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
                sidebarOpen ? (
                  <Badge className="h-5 min-w-[20px] text-[10px] px-1.5 flex-shrink-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                    {badge}
                  </Badge>
                ) : (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 pulse-emerald" />
                )
              )}
            </button>
          )
        })}
      </nav>

      <Separator className="bg-zinc-800" />

      {/* Focus Mode Toggle */}
      <div className={cn('px-4 py-3', !sidebarOpen && 'px-0 flex justify-center')}>
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          {focusMode ? (
            <Moon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between flex-1"
              >
                <span className="text-xs text-zinc-400">Mode Focus</span>
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
      <div className={cn('px-4 py-3 border-t border-zinc-800', !sidebarOpen && 'px-0 flex justify-center')}>
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 ring-2 ring-zinc-800">
            <span className="text-sm font-semibold text-emerald-400">{initials}</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-zinc-200 truncate">{userName}</p>
                <p className="text-xs text-zinc-500 truncate">{userProfession}</p>
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
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-zinc-700 bg-zinc-900 shadow-lg hover:bg-emerald-500/10 hover:border-emerald-500/30 z-10"
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3 text-zinc-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-400" />
        )}
      </Button>
    </motion.aside>
  )
}
