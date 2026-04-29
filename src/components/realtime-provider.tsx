'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useRealtimeNotifications } from '@/hooks/use-realtime'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

const RealtimeContext = createContext<ConnectionStatus>('disconnected')

export function useRealtimeStatus() {
  return useContext(RealtimeContext)
}

interface RealtimeProviderProps {
  children: ReactNode
}

/**
 * Single source of truth for the realtime SSE connection.
 * Exposes connection status via context so children can read it
 * without creating their own SSE connection.
 */
export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { status, isConnected } = useRealtimeNotifications()
  const user = useAppStore((s) => s.user)

  // Show toast on connection status changes (only when user is onboarded)
  useEffect(() => {
    if (!user?.onboardingDone) return

    if (isConnected) {
      toast.success('Notifications en temps réel activées', {
        icon: <Wifi className="w-4 h-4 text-emerald-400" />,
        duration: 3000,
      })
    }
  }, [isConnected, user?.onboardingDone])

  // Show error toast if connection fails permanently
  useEffect(() => {
    if (!user?.onboardingDone) return

    if (status === 'error') {
      toast.error('Connexion temps réel perdue', {
        icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        description: 'Les notifications en temps réel sont indisponibles. Rechargement automatique en cours...',
        duration: 5000,
      })
    }
  }, [status, user?.onboardingDone])

  return (
    <RealtimeContext.Provider value={status}>
      {children}
      {/* Connection status indicator */}
      {user?.onboardingDone && !isConnected && status !== 'connecting' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-900/90 border border-zinc-700 shadow-lg backdrop-blur-sm">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-zinc-300">Hors ligne</span>
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
        </div>
      )}
    </RealtimeContext.Provider>
  )
}
