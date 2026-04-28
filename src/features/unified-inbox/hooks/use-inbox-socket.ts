'use client'

import { io, Socket } from 'socket.io-client'
import { useEffect, useRef, useCallback, useState } from 'react'

// ─── Event Types ────────────────────────────────────────────────────────────

/** Events the client emits to the server */
interface ClientToServerEvents {
  'inbox:join': (data: { userId: string; userName?: string }) => void
  'inbox:leave': (data: { userId: string }) => void
  'inbox:typing': (data: { conversationId: string; userId: string; userName?: string }) => void
  'inbox:viewing': (data: { conversationId: string; userId: string; userName?: string }) => void
  'inbox:stop-viewing': (data: { conversationId: string; userId: string; userName?: string }) => void
}

/** Events the server emits to the client */
interface ServerToClientEvents {
  'inbox:joined': (data: { userId: string; room: string }) => void
  'inbox:new-message': (data: InboxNewMessagePayload) => void
  'inbox:conversation-updated': (data: InboxConversationUpdatedPayload) => void
  'inbox:user-typing': (data: InboxUserTypingPayload) => void
  'inbox:user-viewing': (data: InboxUserViewingPayload) => void
  'inbox:user-stop-viewing': (data: InboxUserStopViewingPayload) => void
  'inbox:viewing-presence': (data: InboxViewingPresencePayload) => void
  'inbox:unread-count': (data: InboxUnreadCountPayload) => void
  'inbox:sync-status': (data: InboxSyncStatusPayload) => void
}

// ─── Payload Types ──────────────────────────────────────────────────────────

export interface InboxNewMessagePayload {
  conversationId: string
  messageId: string
  channel: string
  from: string
  subject?: string
  preview: string
  timestamp: string
}

export interface InboxConversationUpdatedPayload {
  conversationId: string
  type: 'status' | 'assignee' | 'priority' | 'tag' | 'archive'
  previousValue?: string
  newValue?: string
  updatedBy: string
  timestamp: string
}

export interface InboxUserTypingPayload {
  conversationId: string
  userId: string
  userName: string
  isTyping: boolean
}

export interface InboxUserViewingPayload {
  conversationId: string
  userId: string
  userName: string
}

export interface InboxUserStopViewingPayload {
  conversationId: string
  userId: string
  userName: string
}

export interface InboxViewingPresencePayload {
  conversationId: string
  viewers: { userId: string; userName: string }[]
}

export interface InboxUnreadCountPayload {
  userId: string
  totalUnread: number
  perChannel: Record<string, number>
}

export interface InboxSyncStatusPayload {
  channel: string
  status: 'started' | 'completed' | 'failed'
  message?: string
  timestamp: string
}

// ─── Hook Options ───────────────────────────────────────────────────────────

export interface UseInboxSocketOptions {
  /** User ID for joining the personal inbox room */
  userId?: string
  /** Display name for the user */
  userName?: string
  /** Whether to auto-join the inbox room on connect (default: true) */
  autoJoin?: boolean
  /** Whether to enable auto-reconnect (default: true) */
  reconnect?: boolean
  /** Maximum reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number
}

// ─── Hook Return Type ───────────────────────────────────────────────────────

export interface UseInboxSocketReturn {
  /** The raw socket instance (null before connection) */
  socket: Socket | null
  /** Whether the socket is currently connected */
  isConnected: boolean
  /** Join a personal inbox room */
  joinInbox: (userId: string, userName?: string) => void
  /** Leave a personal inbox room */
  leaveInbox: (userId: string) => void
  /** Emit that the current user is typing in a conversation */
  emitTyping: (conversationId: string, userId: string, userName?: string) => void
  /** Emit that the current user is viewing a conversation */
  emitViewing: (conversationId: string, userId: string, userName?: string) => void
  /** Emit that the current user stopped viewing a conversation */
  emitStopViewing: (conversationId: string, userId: string, userName?: string) => void
  /** Listen for new messages in the inbox */
  onNewMessage: (callback: (data: InboxNewMessagePayload) => void) => () => void
  /** Listen for conversation updates */
  onConversationUpdated: (callback: (data: InboxConversationUpdatedPayload) => void) => () => void
  /** Listen for typing indicators */
  onUserTyping: (callback: (data: InboxUserTypingPayload) => void) => () => void
  /** Listen for viewing presence */
  onUserViewing: (callback: (data: InboxUserViewingPayload) => void) => () => void
  /** Listen for stop-viewing events */
  onUserStopViewing: (callback: (data: InboxUserStopViewingPayload) => void) => () => void
  /** Listen for viewing presence (collision detection) */
  onViewingPresence: (callback: (data: InboxViewingPresencePayload) => void) => () => void
  /** Listen for unread count updates */
  onUnreadCount: (callback: (data: InboxUnreadCountPayload) => void) => () => void
  /** Listen for channel sync status updates */
  onSyncStatus: (callback: (data: InboxSyncStatusPayload) => void) => () => void
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Hook for connecting to the Burozen Inbox WebSocket service.
 *
 * Connects via: io('/?XTransformPort=3002')
 * Supports auto-reconnect with exponential backoff.
 *
 * @example
 * ```tsx
 * const { isConnected, joinInbox, onNewMessage, emitTyping } = useInboxSocket({
 *   userId: session?.user?.id,
 *   userName: session?.user?.name,
 * })
 *
 * useEffect(() => {
 *   const unsubscribe = onNewMessage((msg) => {
 *     toast.info(`New message from ${msg.from}`)
 *   })
 *   return unsubscribe
 * }, [onNewMessage])
 * ```
 */
export function useInboxSocket(options: UseInboxSocketOptions = {}): UseInboxSocketReturn {
  const {
    userId,
    userName,
    autoJoin = true,
    reconnect = true,
    maxReconnectAttempts = Infinity,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io('/?XTransformPort=3002', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: reconnect,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    })

    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      setIsConnected(true)
      setSocket(socketInstance)
      console.log('[inbox-socket] Connected:', socketInstance.id)

      // Auto-join inbox room if userId is provided
      if (autoJoin && userId) {
        socketInstance.emit('inbox:join', { userId, userName })
      }
    })

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false)
      console.log('[inbox-socket] Disconnected:', reason)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('[inbox-socket] Connection error:', error.message)
    })

    return () => {
      // Clean up heartbeat interval
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }

      // Leave inbox room and disconnect
      if (userId) {
        socketInstance.emit('inbox:leave', { userId })
      }
      socketInstance.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [userId, userName, autoJoin, reconnect, maxReconnectAttempts])

  // ─── Action callbacks ───────────────────────────────────────────────────

  const joinInbox = useCallback((uid: string, uname?: string) => {
    socketRef.current?.emit('inbox:join', { userId: uid, userName: uname })
  }, [])

  const leaveInbox = useCallback((uid: string) => {
    socketRef.current?.emit('inbox:leave', { userId: uid })
  }, [])

  const emitTyping = useCallback((conversationId: string, uid: string, uname?: string) => {
    socketRef.current?.emit('inbox:typing', { conversationId, userId: uid, userName: uname })
  }, [])

  const emitViewing = useCallback(
    (conversationId: string, uid: string, uname?: string) => {
      socketRef.current?.emit('inbox:viewing', {
        conversationId,
        userId: uid,
        userName: uname,
      })

      // Set up heartbeat to keep viewing presence alive (15s TTL on server)
      // Send heartbeat every 10s to stay within the 15s window
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      heartbeatRef.current = setInterval(() => {
        socketRef.current?.emit('inbox:viewing', {
          conversationId,
          userId: uid,
          userName: uname,
        })
      }, 10000)
    },
    []
  )

  const emitStopViewing = useCallback(
    (conversationId: string, uid: string, uname?: string) => {
      socketRef.current?.emit('inbox:stop-viewing', {
        conversationId,
        userId: uid,
        userName: uname,
      })

      // Clear the heartbeat interval
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    },
    []
  )

  // ─── Event listener callbacks ──────────────────────────────────────────

  const onNewMessage = useCallback((callback: (data: InboxNewMessagePayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}

    socket.on('inbox:new-message', callback)
    return () => {
      socket.off('inbox:new-message', callback)
    }
  }, [])

  const onConversationUpdated = useCallback(
    (callback: (data: InboxConversationUpdatedPayload) => void) => {
      const socket = socketRef.current
      if (!socket) return () => {}

      socket.on('inbox:conversation-updated', callback)
      return () => {
        socket.off('inbox:conversation-updated', callback)
      }
    },
    []
  )

  const onUserTyping = useCallback((callback: (data: InboxUserTypingPayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}

    socket.on('inbox:user-typing', callback)
    return () => {
      socket.off('inbox:user-typing', callback)
    }
  }, [])

  const onUserViewing = useCallback((callback: (data: InboxUserViewingPayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}

    socket.on('inbox:user-viewing', callback)
    return () => {
      socket.off('inbox:user-viewing', callback)
    }
  }, [])

  const onUserStopViewing = useCallback(
    (callback: (data: InboxUserStopViewingPayload) => void) => {
      const socket = socketRef.current
      if (!socket) return () => {}

      socket.on('inbox:user-stop-viewing', callback)
      return () => {
        socket.off('inbox:user-stop-viewing', callback)
      }
    },
    []
  )

  const onViewingPresence = useCallback(
    (callback: (data: InboxViewingPresencePayload) => void) => {
      const socket = socketRef.current
      if (!socket) return () => {}

      socket.on('inbox:viewing-presence', callback)
      return () => {
        socket.off('inbox:viewing-presence', callback)
      }
    },
    []
  )

  const onUnreadCount = useCallback((callback: (data: InboxUnreadCountPayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}

    socket.on('inbox:unread-count', callback)
    return () => {
      socket.off('inbox:unread-count', callback)
    }
  }, [])

  const onSyncStatus = useCallback((callback: (data: InboxSyncStatusPayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}

    socket.on('inbox:sync-status', callback)
    return () => {
      socket.off('inbox:sync-status', callback)
    }
  }, [])

  return {
    socket,
    isConnected,
    joinInbox,
    leaveInbox,
    emitTyping,
    emitViewing,
    emitStopViewing,
    onNewMessage,
    onConversationUpdated,
    onUserTyping,
    onUserViewing,
    onUserStopViewing,
    onViewingPresence,
    onUnreadCount,
    onSyncStatus,
  }
}
