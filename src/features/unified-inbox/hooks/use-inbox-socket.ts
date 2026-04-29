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

// ─── Socket Event Names ────────────────────────────────────────────────────

const SOCKET_EVENTS = [
  'inbox:new-message',
  'inbox:conversation-updated',
  'inbox:user-typing',
  'inbox:user-viewing',
  'inbox:user-stop-viewing',
  'inbox:viewing-presence',
  'inbox:unread-count',
  'inbox:sync-status',
] as const

type SocketEventName = (typeof SOCKET_EVENTS)[number]

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Hook for connecting to the Burozen Inbox WebSocket service.
 *
 * Connects via: io('/?XTransformPort=3002')
 * Supports auto-reconnect with exponential backoff.
 * Preserves event listeners across reconnections.
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

  // Store userName in a ref to avoid triggering socket recreation
  const userNameRef = useRef(userName)
  useEffect(() => { userNameRef.current = userName }, [userName])

  // Store registered event listeners so they survive reconnections
  // Map<eventName, Set<callback>>
  const listenersRef = useRef<Map<SocketEventName, Set<(...args: unknown[]) => void>>>(new Map())

  /**
   * Re-attach all stored listeners to the current socket instance.
   * Called on initial connect and after reconnection.
   */
  const reattachListeners = useCallback((socketInstance: Socket) => {
    for (const [event, callbacks] of listenersRef.current.entries()) {
      for (const cb of callbacks) {
        socketInstance.on(event, cb as (...args: unknown[]) => void)
      }
    }
  }, [])

  // Initialize socket connection — only recreate when userId changes
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

      // Re-attach all stored listeners on (re)connection
      reattachListeners(socketInstance)

      // Auto-join inbox room if userId is provided
      if (autoJoin && userId) {
        socketInstance.emit('inbox:join', { userId, userName: userNameRef.current })
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
  }, [userId, autoJoin, reconnect, maxReconnectAttempts, reattachListeners])

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
    [],
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
    [],
  )

  // ─── Event listener callbacks (with persistent storage) ────────────────

  /**
   * Helper to register a listener that persists across reconnections.
   * Stores the callback in listenersRef and attaches it to the current socket.
   */
  const registerListener = useCallback(
    <T>(event: SocketEventName, callback: (data: T) => void) => {
      const socket = socketRef.current

      // Store in persistent map
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set())
      }
      listenersRef.current.get(event)!.add(callback as (...args: unknown[]) => void)

      // Attach to current socket if connected
      if (socket) {
        socket.on(event, callback as (...args: unknown[]) => void)
      }

      // Return unsubscribe function
      return () => {
        listenersRef.current.get(event)?.delete(callback as (...args: unknown[]) => void)
        socket?.off(event, callback as (...args: unknown[]) => void)
      }
    },
    [],
  )

  const onNewMessage = useCallback(
    (callback: (data: InboxNewMessagePayload) => void) => {
      return registerListener('inbox:new-message', callback)
    },
    [registerListener],
  )

  const onConversationUpdated = useCallback(
    (callback: (data: InboxConversationUpdatedPayload) => void) => {
      return registerListener('inbox:conversation-updated', callback)
    },
    [registerListener],
  )

  const onUserTyping = useCallback(
    (callback: (data: InboxUserTypingPayload) => void) => {
      return registerListener('inbox:user-typing', callback)
    },
    [registerListener],
  )

  const onUserViewing = useCallback(
    (callback: (data: InboxUserViewingPayload) => void) => {
      return registerListener('inbox:user-viewing', callback)
    },
    [registerListener],
  )

  const onUserStopViewing = useCallback(
    (callback: (data: InboxUserStopViewingPayload) => void) => {
      return registerListener('inbox:user-stop-viewing', callback)
    },
    [registerListener],
  )

  const onViewingPresence = useCallback(
    (callback: (data: InboxViewingPresencePayload) => void) => {
      return registerListener('inbox:viewing-presence', callback)
    },
    [registerListener],
  )

  const onUnreadCount = useCallback(
    (callback: (data: InboxUnreadCountPayload) => void) => {
      return registerListener('inbox:unread-count', callback)
    },
    [registerListener],
  )

  const onSyncStatus = useCallback(
    (callback: (data: InboxSyncStatusPayload) => void) => {
      return registerListener('inbox:sync-status', callback)
    },
    [registerListener],
  )

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
