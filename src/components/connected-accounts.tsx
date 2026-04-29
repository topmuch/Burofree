'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Plus, RefreshCw, Trash2, CheckCircle2, AlertCircle,
  Clock, Shield, Eye, EyeOff, ExternalLink, Loader2,
  Unplug
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountSyncStatus {
  accountId: string
  provider: string
  email: string
  lastSync: string | null
  messageCount: number
  eventCount?: number
  hasToken: boolean
  tokenExpiry: string | null
}

interface AccountHealth {
  isConnected: boolean
  tokenValid: boolean
  canReadMail: boolean
  canSendMail: boolean
  canAccessCalendar: boolean
  lastChecked: string
}

// ─── Provider Config ─────────────────────────────────────────────────────────

const providerConfig: Record<string, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
}> = {
  gmail: {
    label: 'Gmail',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  outlook: {
    label: 'Outlook',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L1 7v10l11 5 11-5V7L12 2z" fill="#0078D4" opacity="0.6"/>
        <path d="M12 2L1 7l11 5 11-5L12 2z" fill="#0364B8"/>
        <path d="M12 12v10l11-5V7l-11 5z" fill="#1490DF"/>
        <path d="M12 12L1 7v10l11 5V12z" fill="#28A8EA"/>
      </svg>
    ),
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConnectedAccounts() {
  const { emailAccounts, fetchEmailAccounts, fetchEmails } = useAppStore()

  const [syncStatuses, setSyncStatuses] = useState<AccountSyncStatus[]>([])
  const [healthStatuses, setHealthStatuses] = useState<Record<string, AccountHealth>>({})
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({})
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  // Fetch sync statuses
  const fetchSyncStatuses = useCallback(async () => {
    setIsLoadingStatus(true)
    try {
      const [emailRes, calRes] = await Promise.all([
        fetch('/api/emails/sync'),
        fetch('/api/calendar/sync'),
      ])

      const emailData = emailRes.ok ? await emailRes.json() : { accounts: [] }
      const calData = calRes.ok ? await calRes.json() : { accounts: [] }

      // Merge email and calendar sync statuses
      const emailStatuses: AccountSyncStatus[] = (emailData.accounts || []).map(
        (a: Record<string, unknown>) => ({
          accountId: a.accountId as string,
          provider: a.provider as string,
          email: a.email as string,
          lastSync: a.lastSync as string | null,
          messageCount: a.messageCount as number,
          hasToken: a.hasToken as boolean,
          tokenExpiry: a.tokenExpiry as string | null,
        })
      )

      // Add event counts from calendar data
      const calStatuses: Record<string, number> = {}
      for (const a of (calData.accounts || [])) {
        calStatuses[(a as Record<string, unknown>).accountId as string] = (a as Record<string, unknown>).eventCount as number
      }

      const merged = emailStatuses.map((s) => ({
        ...s,
        eventCount: calStatuses[s.accountId] || 0,
      }))

      setSyncStatuses(merged)
    } catch (error) {
      console.error('Error fetching sync statuses:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    fetchSyncStatuses()
  }, [fetchSyncStatuses, emailAccounts])

  // Check account health
  const checkHealth = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`/api/accounts/health?accountId=${accountId}`)
      if (res.ok) {
        const data = await res.json()
        setHealthStatuses((prev) => ({ ...prev, [accountId]: data }))
      }
    } catch (error) {
      console.error('Error checking account health:', error)
    }
  }, [])

  // Sync emails for a specific account
  const syncAccount = useCallback(async (accountId: string) => {
    setIsSyncing((prev) => ({ ...prev, [accountId]: true }))
    try {
      const [emailRes, calRes] = await Promise.all([
        fetch('/api/emails/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId }),
        }),
        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId }),
        }),
      ])

      const emailData = emailRes.ok ? await emailRes.json() : {}
      const calData = calRes.ok ? await calRes.json() : {}

      const totalSynced = (emailData.synced || 0) + (calData.synced || 0)

      if (totalSynced > 0) {
        toast.success(`${totalSynced} élément(s) synchronisé(s)`)
      } else {
        toast.info('Aucun nouvel élément à synchroniser')
      }

      if (emailData.errors?.length || calData.errors?.length) {
        const allErrors = [...(emailData.errors || []), ...(calData.errors || [])]
        toast.error(allErrors[0])
      }

      await fetchSyncStatuses()
      await fetchEmails()
      await checkHealth(accountId)
    } catch (error) {
      toast.error('Erreur lors de la synchronisation')
    } finally {
      setIsSyncing((prev) => ({ ...prev, [accountId]: false }))
    }
  }, [fetchSyncStatuses, fetchEmails, checkHealth])

  // Sync all accounts
  const syncAll = useCallback(async () => {
    setIsSyncingAll(true)
    try {
      const [emailRes, calRes] = await Promise.all([
        fetch('/api/emails/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      ])

      const emailData = emailRes.ok ? await emailRes.json() : {}
      const calData = calRes.ok ? await calRes.json() : {}

      const totalSynced = (emailData.synced || 0) + (calData.synced || 0)

      if (totalSynced > 0) {
        toast.success(`${totalSynced} élément(s) synchronisé(s) au total`)
      } else {
        toast.info('Aucun nouvel élément à synchroniser')
      }

      await fetchSyncStatuses()
      await fetchEmails()
    } catch (error) {
      toast.error('Erreur lors de la synchronisation')
    } finally {
      setIsSyncingAll(false)
    }
  }, [fetchSyncStatuses, fetchEmails])

  // Remove account
  const removeAccount = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`/api/email-accounts/${accountId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Compte supprimé')
        await fetchEmailAccounts()
        await fetchSyncStatuses()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression du compte')
    }
  }, [fetchEmailAccounts, fetchSyncStatuses])

  // Trigger OAuth flow for adding a new account
  const startOAuthFlow = useCallback((provider: string) => {
    // For now, redirect to NextAuth sign-in with the appropriate provider
    const callbackUrl = encodeURIComponent(window.location.pathname)
    if (provider === 'gmail') {
      window.location.href = `/api/auth/signin/google?callbackUrl=${callbackUrl}`
    } else if (provider === 'outlook') {
      window.location.href = `/api/auth/signin/azure-ad?callbackUrl=${callbackUrl}`
    }
    setAddAccountOpen(false)
  }, [])

  // Format date for display
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Jamais'
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return 'À l\'instant'
      if (minutes < 60) return `Il y a ${minutes} min`
      if (hours < 24) return `Il y a ${hours}h`
      if (days < 7) return `Il y a ${days}j`
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    } catch {
      return 'Inconnu'
    }
  }

  // Get token status for an account
  const getTokenStatus = (status: AccountSyncStatus): {
    label: string
    color: string
    icon: React.ReactNode
  } => {
    if (!status.hasToken) {
      return {
        label: 'Non connecté',
        color: 'text-red-400',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
      }
    }

    if (status.tokenExpiry) {
      const expiry = new Date(status.tokenExpiry)
      const now = new Date()
      const buffer = new Date(now.getTime() + 5 * 60 * 1000)

      if (expiry > buffer) {
        return {
          label: 'Token valide',
          color: 'text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        }
      }

      if (expiry > now) {
        return {
          label: 'Expire bientôt',
          color: 'text-amber-400',
          icon: <Clock className="w-3.5 h-3.5" />,
        }
      }
    }

    return {
      label: 'Token expiré',
      color: 'text-red-400',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Mail className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Comptes connectés</h3>
            <p className="text-xs text-muted-foreground">
              Gérer vos comptes email et calendrier
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {emailAccounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={syncAll}
              disabled={isSyncingAll}
              className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              {isSyncingAll ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
              )}
              Tout synchroniser
            </Button>
          )}

          <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Connecter un compte</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {/* Google */}
                <button
                  onClick={() => startOAuthFlow('gmail')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    {providerConfig.gmail.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Google</p>
                    <p className="text-xs text-muted-foreground">Gmail & Google Calendar</p>
                  </div>
                </button>

                {/* Microsoft */}
                <button
                  onClick={() => startOAuthFlow('outlook')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    {providerConfig.outlook.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Microsoft</p>
                    <p className="text-xs text-muted-foreground">Outlook & Calendrier</p>
                  </div>
                </button>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddAccountOpen(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Cards */}
      {emailAccounts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Unplug className="w-6 h-6 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 mb-1">Aucun compte connecté</p>
          <p className="text-xs text-zinc-500">
            Connectez Gmail ou Outlook pour synchroniser vos emails et calendrier
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {emailAccounts.map((account, index) => {
              const config = providerConfig[account.provider] || providerConfig.gmail
              const status = syncStatuses.find((s) => s.accountId === account.id)
              const health = healthStatuses[account.id]
              const syncing = isSyncing[account.id] || false
              const tokenStatus = status ? getTokenStatus(status) : null

              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    'border transition-colors',
                    config.borderColor,
                    'hover:border-opacity-60'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Provider Icon */}
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          config.bgColor
                        )}>
                          {config.icon}
                        </div>

                        {/* Account Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">
                              {account.email}
                            </p>
                            {account.isPrimary && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 shrink-0 border-emerald-500/30 text-emerald-400"
                              >
                                Principal
                              </Badge>
                            )}
                            <Badge className={cn('text-[10px] h-4 shrink-0', config.bgColor, config.color)}>
                              {config.label}
                            </Badge>
                          </div>

                          {/* Sync Stats */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {status && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {status.messageCount} emails
                                </span>
                                {(status.eventCount ?? 0) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {status.eventCount} événements
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3" />
                                  {formatDate(status.lastSync)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Token / Health Status */}
                          <div className="flex items-center gap-3 mt-2">
                            {tokenStatus && (
                              <span className={cn(
                                'flex items-center gap-1 text-[11px]',
                                tokenStatus.color
                              )}>
                                {tokenStatus.icon}
                                {tokenStatus.label}
                              </span>
                            )}
                            {health && (
                              <span className={cn(
                                'flex items-center gap-1 text-[11px]',
                                health.isConnected ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                <Shield className="w-3 h-3" />
                                {health.isConnected ? 'Connecté' : 'Déconnecté'}
                              </span>
                            )}
                          </div>

                          {/* Health Details */}
                          {health && health.isConnected && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1">
                                <Progress
                                  value={(() => {
                                    const perms = [
                                      health.canReadMail,
                                      health.canSendMail,
                                      health.canAccessCalendar,
                                    ]
                                    return (perms.filter(Boolean).length / perms.length) * 100
                                  })()}
                                  className="h-1.5 bg-zinc-800"
                                />
                              </div>
                              <span className="text-[10px] text-zinc-500 shrink-0">
                                {[
                                  health.canReadMail && 'Lecture',
                                  health.canSendMail && 'Envoi',
                                  health.canAccessCalendar && 'Calendrier',
                                ].filter(Boolean).join(' · ') || 'Aucune permission'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-emerald-400"
                            onClick={() => syncAccount(account.id)}
                            disabled={syncing}
                            title="Synchroniser"
                          >
                            {syncing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-amber-400"
                            onClick={() => checkHealth(account.id)}
                            title="Vérifier la connexion"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-red-400"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Le compte {account.email} sera déconnecté. Les emails déjà synchronisés seront conservés.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeAccount(account.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
