'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckCheck, Trash2, Info, AlertTriangle, AlertCircle,
  CheckCircle, ChevronDown, Clock, Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAppStore, type Notification } from '@/lib/store'
import { cn } from '@/lib/utils'

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  info: { icon: Info, color: 'text-emerald-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400' },
  urgent: { icon: AlertCircle, color: 'text-red-400' },
  success: { icon: CheckCircle, color: 'text-green-400' },
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`
  if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function getDateGroup(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return 'Cette semaine'
  return 'Plus ancien'
}

export function NotificationsPanel() {
  const { notifications, markNotificationRead, markAllNotificationsRead, deleteNotification } = useAppStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifInApp, setNotifInApp] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifVoice, setNotifVoice] = useState(false)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('08:00')

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Group notifications by date category
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {}
    const groupOrder = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien']

    notifications.forEach(notif => {
      const group = getDateGroup(notif.createdAt)
      if (!groups[group]) groups[group] = []
      groups[group].push(notif)
    })

    return groupOrder
      .filter(g => groups[g] && groups[g].length > 0)
      .map(g => ({ label: g, items: groups[g] }))
  }, [notifications])

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markNotificationRead(notif.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Centre de notifications</h2>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs mt-0.5">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllNotificationsRead}
              className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar space-y-6">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
              <p className="text-xs text-muted-foreground mt-1">Vous êtes à jour !</p>
            </CardContent>
          </Card>
        ) : (
          groupedNotifications.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {group.items.map((notif) => {
                    const config = typeConfig[notif.type] || typeConfig.info
                    const IconComp = config.icon

                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, height: 0 }}
                        className={cn(
                          'relative flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer group',
                          !notif.isRead
                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                            : 'bg-card border-border hover:bg-muted/50'
                        )}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        {/* Icon */}
                        <div className={cn('p-1.5 rounded-lg flex-shrink-0', !notif.isRead ? 'bg-emerald-500/10' : 'bg-secondary')}>
                          <IconComp className={cn('w-4 h-4', config.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn('text-sm', !notif.isRead ? 'font-semibold' : 'font-medium text-muted-foreground')}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {getRelativeTime(notif.createdAt)}
                          </p>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notif.id)
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notification Settings */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-400" />
                  Paramètres de notification
                </CardTitle>
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  settingsOpen && 'rotate-180'
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <Separator />

              {/* Toggle rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Notifications in-app</p>
                    <p className="text-xs text-muted-foreground">Recevoir les alertes dans l&apos;application</p>
                  </div>
                  <Switch
                    checked={notifInApp}
                    onCheckedChange={setNotifInApp}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Notifications par email</p>
                    <p className="text-xs text-muted-foreground">Recevoir les alertes par courriel</p>
                  </div>
                  <Switch
                    checked={notifEmail}
                    onCheckedChange={setNotifEmail}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Notifications SMS</p>
                    <p className="text-xs text-muted-foreground">Recevoir les alertes par SMS</p>
                  </div>
                  <Switch
                    checked={notifSms}
                    onCheckedChange={setNotifSms}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Rappels vocaux</p>
                    <p className="text-xs text-muted-foreground">Recevoir des rappels vocaux</p>
                  </div>
                  <Switch
                    checked={notifVoice}
                    onCheckedChange={setNotifVoice}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              <Separator />

              {/* Quiet hours */}
              <div>
                <Label className="text-sm font-medium">Heures calmes</Label>
                <p className="text-xs text-muted-foreground mb-2">Désactiver les notifications pendant ces heures</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="bg-secondary w-32"
                  />
                  <span className="text-sm text-muted-foreground">à</span>
                  <Input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="bg-secondary w-32"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
