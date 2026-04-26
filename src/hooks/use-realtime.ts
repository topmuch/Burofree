'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { showBrowserNotification, playNotificationSound } from '@/lib/notifications'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface SSEEvent {
  type: string
  payload: Record<string, unknown>
}

const MAX_RECONNECT_ATTEMPTS = 10
const BASE_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000

export function useRealtimeNotifications() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const isManualClose = useRef(false)
  const connectFnRef = useRef<() => void>(() => {})

  const { fetchReminders, fetchNotifications, fetchTasks, fetchInvoices, fetchEmails, fetchStats } = useAppStore()

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current),
      MAX_RECONNECT_DELAY
    )
    return delay + Math.random() * 1000
  }, [])

  const handleEvent = useCallback((event: SSEEvent) => {
    const { type, payload } = event

    switch (type) {
      case 'connected':
        setStatus('connected')
        reconnectAttempts.current = 0
        break

      case 'reminder_due': {
        const title = payload.title as string
        const message = (payload.message as string) || title
        const relatedType = payload.relatedType as string | null

        showBrowserNotification(
          '⏰ Rappel - Maellis',
          message,
          relatedType === 'task' ? '#tasks' : relatedType === 'invoice' ? '#invoices' : undefined
        )
        playNotificationSound()

        fetchReminders()
        fetchNotifications()
        fetchStats()
        break
      }

      case 'task_deadline_approaching': {
        const taskTitle = payload.title as string
        const priority = payload.priority as string

        showBrowserNotification(
          '📋 Échéance proche - Maellis',
          `La tâche "${taskTitle}" arrive à échéance`,
          '#tasks'
        )

        if (priority === 'high' || priority === 'urgent') {
          playNotificationSound()
        }

        fetchTasks()
        fetchStats()
        break
      }

      case 'invoice_overdue': {
        const invoiceNumber = payload.number as string
        const clientName = payload.clientName as string

        showBrowserNotification(
          '💰 Facture en retard - Maellis',
          `Facture ${invoiceNumber} (${clientName}) est en retard`,
          '#invoices'
        )
        playNotificationSound()

        fetchInvoices()
        fetchStats()
        break
      }

      case 'unread_emails': {
        const count = payload.count as number
        if (count > 0) {
          showBrowserNotification(
            '📧 Emails non lus - Maellis',
            `Vous avez ${count} email${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}`,
            '#emails'
          )
        }

        fetchEmails()
        fetchStats()
        break
      }

      case 'notification_pending': {
        const notifTitle = payload.title as string
        const notifMessage = payload.message as string
        const notifType = payload.type as string
        const actionUrl = payload.actionUrl as string | null

        showBrowserNotification(
          `🔔 ${notifTitle} - Maellis`,
          notifMessage,
          actionUrl || undefined
        )

        if (notifType === 'urgent') {
          playNotificationSound()
        }

        fetchNotifications()
        break
      }

      default:
        break
    }
  }, [fetchReminders, fetchNotifications, fetchTasks, fetchInvoices, fetchEmails, fetchStats])

  const disconnect = useCallback(() => {
    isManualClose.current = true

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setStatus('disconnected')
  }, [])

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (isManualClose.current) return

    setStatus('connecting')

    try {
      const eventSource = new EventSource('/api/notifications/stream')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setStatus('connected')
        reconnectAttempts.current = 0
      }

      eventSource.onmessage = (message) => {
        try {
          const event: SSEEvent = JSON.parse(message.data)
          handleEvent(event)
        } catch {
          // Ignore parse errors (heartbeats are comments, not data)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        eventSourceRef.current = null
        setStatus('disconnected')

        if (!isManualClose.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = getReconnectDelay()
          reconnectAttempts.current++

          reconnectTimeout.current = setTimeout(() => {
            if (!isManualClose.current) {
              connectFnRef.current()
            }
          }, delay)
        } else {
          setStatus('error')
        }
      }
    } catch {
      setStatus('error')

      if (!isManualClose.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = getReconnectDelay()
        reconnectAttempts.current++

        reconnectTimeout.current = setTimeout(() => {
          if (!isManualClose.current) {
            connectFnRef.current()
          }
        }, delay)
      }
    }
  }, [handleEvent, getReconnectDelay])

  // Keep ref in sync
  useEffect(() => {
    connectFnRef.current = connect
  }, [connect])

  const reconnect = useCallback(() => {
    isManualClose.current = false
    reconnectAttempts.current = 0
    disconnect()
    setTimeout(() => {
      isManualClose.current = false
      connect()
    }, 100)
  }, [connect, disconnect])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isManualClose.current = false
    // Use microtask to avoid synchronous setState in effect body
    const id = setTimeout(() => connect(), 0)

    return () => {
      clearTimeout(id)
      disconnect()
    }
  }, [connect, disconnect])

  // Reconnect when window regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (status === 'disconnected' || status === 'error')) {
        isManualClose.current = false
        reconnectAttempts.current = 0
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, connect])

  return {
    status,
    reconnect,
    disconnect,
    isConnected: status === 'connected',
  }
}
