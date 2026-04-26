'use client'

import { useState } from 'react'
import { RefreshCw, Calendar, CheckCircle2, AlertCircle, CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface CalendarSyncButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

export function CalendarSyncButton({
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true,
}: CalendarSyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<{ synced: number; updated: number; skipped: number } | null>(null)
  const { emailAccounts, fetchEvents } = useAppStore()

  const hasConnectedAccount = emailAccounts.length > 0

  const handleSync = async () => {
    if (!hasConnectedAccount) {
      toast.error('Aucun compte connecté', {
        description: 'Connectez un compte Gmail ou Outlook pour synchroniser votre calendrier.',
      })
      return
    }

    setSyncing(true)
    setLastResult(null)

    try {
      // Sync next 3 months of events
      const timeMin = new Date()
      const timeMax = new Date()
      timeMax.setMonth(timeMax.getMonth() + 3)

      const res = await fetch(
        `/api/calendar/sync?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`,
        {
          method: 'GET',
        },
      )

      if (!res.ok) {
        const data = await res.json()
        toast.error('Erreur de synchronisation', {
          description: data.error || 'Impossible de synchroniser le calendrier.',
        })
        return
      }

      const data = await res.json()
      setLastResult({ synced: data.synced, updated: data.updated, skipped: data.skipped })

      // Refresh the local store
      await fetchEvents()

      const totalChanges = data.synced + data.updated
      if (totalChanges > 0) {
        toast.success(`${data.synced} événement(s) ajouté(s), ${data.updated} mis à jour`, {
          description: `Synchronisé depuis votre calendrier connecté.`,
        })
      } else {
        toast.info('Calendrier à jour', {
          description: 'Aucun nouvel événement à synchroniser.',
        })
      }
    } catch (error) {
      console.error('Calendar sync error:', error)
      toast.error('Erreur de connexion', {
        description: 'Impossible de contacter le serveur.',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : lastResult && (lastResult.synced + lastResult.updated) > 0 ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : !hasConnectedAccount ? (
          <CalendarOff className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Calendar className="w-4 h-4" />
        )}
        {showLabel && (
          <span>
            {syncing
              ? 'Synchronisation...'
              : hasConnectedAccount
                ? 'Synchroniser'
                : 'Non connecté'}
          </span>
        )}
      </Button>

      {lastResult && (lastResult.synced + lastResult.updated) > 0 && !syncing && (
        <span className="text-xs text-emerald-400 font-medium">
          +{lastResult.synced + lastResult.updated}
        </span>
      )}
    </div>
  )
}
