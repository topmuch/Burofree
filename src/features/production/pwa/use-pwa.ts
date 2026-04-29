'use client'

/**
 * usePWA — Custom hook for PWA functionality
 *
 * Combines install prompt, offline queue, network status,
 * and push notification management into a single reactive hook.
 */

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import { getOfflineQueue } from './offline-queue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAState {
  /** Whether the app can be installed (beforeinstallprompt fired) */
  canInstall: boolean
  /** Whether the app is already installed (standalone mode) */
  isInstalled: boolean
  /** Whether the user is currently online */
  isOnline: boolean
  /** Number of pending offline actions */
  queueCount: number
  /** Current sync status */
  syncStatus: 'idle' | 'syncing' | 'error' | 'success'
  /** Trigger the install prompt */
  promptInstall: () => Promise<boolean>
  /** Manually trigger sync */
  triggerSync: () => Promise<{ synced: number; failed: number }>
}

// ─── useSyncExternalStore adapters for isInstalled ──────────────────────

function subscribeToInstalledState(callback: () => void): () => void {
  const mql = window.matchMedia('(display-mode: standalone)')
  mql.addEventListener('change', callback)
  window.addEventListener('appinstalled', callback)
  return () => {
    mql.removeEventListener('change', callback)
    window.removeEventListener('appinstalled', callback)
  }
}

function getInstalledSnapshot(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function getInstalledServerSnapshot(): boolean {
  return false
}

// ─── useSyncExternalStore adapters for isOnline ─────────────────────────

function subscribeToOnlineState(callback: () => void): () => void {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot(): boolean {
  return navigator.onLine
}

function getOnlineServerSnapshot(): boolean {
  return true
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const [canInstall, setCanInstall] = useState(false)
  const isInstalled = useSyncExternalStore(subscribeToInstalledState, getInstalledSnapshot, getInstalledServerSnapshot)
  const isOnline = useSyncExternalStore(subscribeToOnlineState, getOnlineSnapshot, getOnlineServerSnapshot)
  const [queueCount, setQueueCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<PWAState['syncStatus']>('idle')
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const offlineQueueRef = useRef<ReturnType<typeof getOfflineQueue> | null>(null)

  // Initialize offline queue
  useEffect(() => {
    const queue = getOfflineQueue()
    offlineQueueRef.current = queue

    queue.count().then(setQueueCount).catch(() => {})
    const unsubscribe = queue.onChange(setQueueCount)
    return unsubscribe
  }, [])

  // Listen for install prompt events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      installPromptRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setCanInstall(false)
      installPromptRef.current = null
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Auto-sync when coming back online (via event listener, not reactive effect)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      if (offlineQueueRef.current) {
        setSyncStatus('syncing')
        offlineQueueRef.current.syncToServer().then(
          () => setSyncStatus('success'),
          () => setSyncStatus('error')
        )
      }
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Prompt install
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPromptRef.current) return false

    try {
      await installPromptRef.current.prompt()
      const result = await installPromptRef.current.userChoice
      installPromptRef.current = null
      setCanInstall(false)
      return result.outcome === 'accepted'
    } catch {
      return false
    }
  }, [])

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!offlineQueueRef.current || !navigator.onLine) {
      return { synced: 0, failed: 0 }
    }

    setSyncStatus('syncing')
    try {
      const result = await offlineQueueRef.current.syncToServer()
      setSyncStatus(result.failed > 0 ? 'error' : 'success')
      return result
    } catch {
      setSyncStatus('error')
      return { synced: 0, failed: 0 }
    }
  }, [])

  // Register periodic sync if supported
  useEffect(() => {
    if (typeof window === 'undefined') return

    navigator.serviceWorker?.ready.then((registration) => {
      if ('periodicSync' in registration) {
        (registration as unknown as { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } })
          .periodicSync.register('sync-offline-periodic', {
            minInterval: 15 * 60 * 1000, // 15 minutes
          })
          .catch(() => {
            // Periodic sync not supported or permission denied
          })
      }
    })
  }, [])

  return {
    canInstall,
    isInstalled,
    isOnline,
    queueCount,
    syncStatus,
    promptInstall,
    triggerSync,
  }
}
