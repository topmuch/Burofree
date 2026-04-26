'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore, type Reminder } from '@/lib/store'
import { ReminderForm } from '@/components/reminder-form'
import { getTimeUntilReminder, formatReminderDate, requestNotificationPermission, showBrowserNotification, checkDueReminders } from '@/lib/notifications'
import { Bell, BellOff, Plus, Trash2, Check, Clock, Mail, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export function RemindersPanel() {
  const { reminders, updateReminder, deleteReminder } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(false)

  useEffect(() => {
    requestNotificationPermission().then(setNotificationPermission)
  }, [])

  // Check for due reminders every 30 seconds
  useEffect(() => {
    const checkReminders = () => {
      const due = checkDueReminders(reminders)
      due.forEach((reminder) => {
        toast.info(`🔔 ${reminder.title}`, {
          description: reminder.message || 'Rappel en cours',
          duration: 8000,
        })
        showBrowserNotification(reminder.title, reminder.message || 'Rappel en cours')
        updateReminder(reminder.id, { isSent: true })
      })
    }

    checkReminders()
    const interval = setInterval(checkReminders, 30000)
    return () => clearInterval(interval)
  }, [reminders, updateReminder])

  const activeReminders = reminders
    .filter((r: Reminder) => !r.isSent)
    .sort((a: Reminder, b: Reminder) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())

  const pastReminders = reminders
    .filter((r: Reminder) => r.isSent)
    .sort((a: Reminder, b: Reminder) => new Date(b.remindAt).getTime() - new Date(a.remindAt).getTime())

  const handleDismiss = async (id: string) => {
    await updateReminder(id, { isSent: true })
    toast.success('Rappel marqué comme envoyé')
  }

  const handleDelete = async (id: string) => {
    await deleteReminder(id)
    toast.success('Rappel supprimé')
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rappels</h1>
          <p className="text-muted-foreground text-sm">Ne manquez jamais une échéance importante</p>
        </div>
        <div className="flex items-center gap-2">
          {!notificationPermission && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestNotificationPermission().then(setNotificationPermission)}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Activer notifications
            </Button>
          )}
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau rappel
          </Button>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Active Reminders */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary notification-pulse" />
                Rappels actifs
                <Badge variant="secondary" className="ml-auto text-xs">
                  {activeReminders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeReminders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BellOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun rappel actif</p>
                  <p className="text-xs mt-1">Créez un rappel pour ne rien oublier</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  <AnimatePresence>
                    {activeReminders.map((reminder: Reminder) => (
                      <motion.div
                        key={reminder.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 rounded-lg border hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-lg ${
                            reminder.type === 'email' ? 'bg-rose-500/10' : 'bg-primary/10'
                          }`}>
                            {reminder.type === 'email' ? (
                              <Mail className="h-4 w-4 text-rose-500" />
                            ) : (
                              <Bell className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{reminder.title}</p>
                            {reminder.message && (
                              <p className="text-xs text-muted-foreground mt-0.5">{reminder.message}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-primary font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeUntilReminder(reminder.remindAt)}
                              </span>
                              <span className="text-xs text-muted-foreground/50">
                                {formatReminderDate(reminder.remindAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDismiss(reminder.id)}
                              title="Marquer comme envoyé"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-destructive"
                              onClick={() => handleDelete(reminder.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Past Reminders */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Rappels passés
                <Badge variant="secondary" className="ml-auto text-xs">
                  {pastReminders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun rappel passé</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {pastReminders.map((reminder: Reminder) => (
                    <div
                      key={reminder.id}
                      className="p-3 rounded-lg border opacity-60 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${
                          reminder.type === 'email' ? 'bg-rose-500/10' : 'bg-muted'
                        }`}>
                          {reminder.type === 'email' ? (
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Bell className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-through">{reminder.title}</p>
                          {reminder.message && (
                            <p className="text-xs text-muted-foreground mt-0.5">{reminder.message}</p>
                          )}
                          <span className="text-xs text-muted-foreground/50 mt-1 block">
                            {formatReminderDate(reminder.remindAt)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={() => handleDelete(reminder.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <ReminderForm open={showForm} onOpenChange={setShowForm} />
    </motion.div>
  )
}
