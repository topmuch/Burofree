'use client'

import { useState } from 'react'
import { RefreshCw, Mail, CheckCircle2, AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface EmailSyncButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

export function EmailSyncButton({
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true,
}: EmailSyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<{ imported: number; skipped: number } | null>(null)
  const { emailAccounts, fetchEmails, fetchEmailAccounts } = useAppStore()

  const hasConnectedAccount = emailAccounts.length > 0

  const handleSync = async () => {
    if (!hasConnectedAccount) {
      toast.error('Aucun compte email connecté', {
        description: 'Connectez un compte Gmail ou Outlook pour synchroniser vos emails.',
      })
      return
    }

    setSyncing(true)
    setLastResult(null)

    try {
      const res = await fetch('/api/emails/sync', {
        method: 'GET',
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error('Erreur de synchronisation', {
          description: data.error || 'Impossible de synchroniser les emails.',
        })
        return
      }

      const data = await res.json()
      setLastResult({ imported: data.imported, skipped: data.skipped })

      // Refresh the local store
      await fetchEmails()
      await fetchEmailAccounts()

      if (data.imported > 0) {
        toast.success(`${data.imported} nouvel(aux) email(s) importé(s)`, {
          description: data.skipped > 0 ? `${data.skipped} email(s) déjà existant(s)` : undefined,
        })
      } else {
        toast.info('Aucun nouvel email', {
          description: 'Tous les emails sont déjà synchronisés.',
        })
      }
    } catch (error) {
      console.error('Email sync error:', error)
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
        ) : lastResult && lastResult.imported > 0 ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : !hasConnectedAccount ? (
          <Inbox className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Mail className="w-4 h-4" />
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

      {lastResult && lastResult.imported > 0 && !syncing && (
        <span className="text-xs text-emerald-400 font-medium">
          +{lastResult.imported}
        </span>
      )}
    </div>
  )
}
