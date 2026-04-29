import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const PORT = 3002

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path — Caddy uses it to forward requests
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Types ──────────────────────────────────────────────────────────────────

interface TypingEntry {
  conversationId: string
  userId: string
  userName: string
  timeout: ReturnType<typeof setTimeout>
}

interface ViewingEntry {
  conversationId: string
  userId: string
  userName: string
  expiresAt: number
}

// ─── In-memory state ────────────────────────────────────────────────────────

/** socket.id → { userId, userName } */
const connectedUsers = new Map<string, { userId: string; userName: string }>()

/** `${socket.id}:${conversationId}` → TypingEntry */
const typingEntries = new Map<string, TypingEntry>()

/** `${socket.id}:${conversationId}` → ViewingEntry */
const viewingEntries = new Map<string, ViewingEntry>()

/** conversationId → Set of socket ids currently viewing */
const conversationViewers = new Map<string, Set<string>>()

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPING_TIMEOUT_MS = 3000 // auto-clear typing after 3s inactivity
const VIEWING_TTL_MS = 15000 // viewing presence heartbeat TTL: 15s

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInboxRoom(userId: string): string {
  return `inbox:${userId}`
}

function getConversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`
}

function typingKey(socketId: string, conversationId: string): string {
  return `${socketId}:${conversationId}`
}

function viewingKey(socketId: string, conversationId: string): string {
  return `${socketId}:${conversationId}`
}

/** Get all viewers (except the sender) for a conversation */
function getOtherViewerIds(conversationId: string, excludeSocketId: string): string[] {
  const viewers = conversationViewers.get(conversationId)
  if (!viewers) return []
  return Array.from(viewers).filter((id) => id !== excludeSocketId)
}

/** Clean up all state for a given socket */
function cleanupSocket(socket: Socket): void {
  const socketId = socket.id

  // Remove from connected users
  connectedUsers.delete(socketId)

  // Clear all typing entries for this socket
  for (const [key, entry] of typingEntries.entries()) {
    if (key.startsWith(`${socketId}:`)) {
      clearTimeout(entry.timeout)
      typingEntries.delete(key)

      // Notify others in the conversation that this user stopped typing
      socket.to(getConversationRoom(entry.conversationId)).emit('inbox:user-typing', {
        conversationId: entry.conversationId,
        userId: entry.userId,
        userName: entry.userName,
        isTyping: false,
      })
    }
  }

  // Clear all viewing entries for this socket
  for (const [key, entry] of viewingEntries.entries()) {
    if (key.startsWith(`${socketId}:`)) {
      viewingEntries.delete(key)

      // Remove from conversation viewers set
      const viewers = conversationViewers.get(entry.conversationId)
      if (viewers) {
        viewers.delete(socketId)
        if (viewers.size === 0) {
          conversationViewers.delete(entry.conversationId)
        }
      }

      // Notify others in the conversation that this user stopped viewing
      socket.to(getConversationRoom(entry.conversationId)).emit('inbox:user-stop-viewing', {
        conversationId: entry.conversationId,
        userId: entry.userId,
        userName: entry.userName,
      })
    }
  }

  // Leave all rooms (except the default room)
  const rooms = Array.from(socket.rooms).filter((r) => r !== socketId)
  for (const room of rooms) {
    socket.leave(room)
  }
}

// ─── Periodic cleanup for expired viewing entries ───────────────────────────

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of viewingEntries.entries()) {
    if (now >= entry.expiresAt) {
      viewingEntries.delete(key)

      // Parse socketId from key
      const colonIndex = key.indexOf(':')
      const socketId = key.substring(0, colonIndex)
      const conversationId = entry.conversationId

      // Remove from conversation viewers set
      const viewers = conversationViewers.get(conversationId)
      if (viewers) {
        viewers.delete(socketId)
        if (viewers.size === 0) {
          conversationViewers.delete(conversationId)
        }
      }

      // Notify others
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.to(getConversationRoom(conversationId)).emit('inbox:user-stop-viewing', {
          conversationId,
          userId: entry.userId,
          userName: entry.userName,
        })
      }

      console.log(`[viewing:expired] userId=${entry.userId} convId=${conversationId}`)
    }
  }
}, 5000) // check every 5 seconds

// ─── Connection handler ─────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.log(`[connected] socket=${socket.id}`)

  // ─── inbox:join ──────────────────────────────────────────────────────
  socket.on('inbox:join', (data: { userId: string; userName?: string }) => {
    const { userId, userName } = data
    if (!userId) return

    const room = getInboxRoom(userId)
    socket.join(room)
    connectedUsers.set(socket.id, { userId, userName: userName ?? userId })

    console.log(`[inbox:join] userId=${userId} socket=${socket.id} room=${room}`)

    // Acknowledge the join
    socket.emit('inbox:joined', { userId, room })
  })

  // ─── inbox:leave ─────────────────────────────────────────────────────
  socket.on('inbox:leave', (data: { userId: string }) => {
    const { userId } = data
    if (!userId) return

    const room = getInboxRoom(userId)
    socket.leave(room)

    console.log(`[inbox:leave] userId=${userId} socket=${socket.id} room=${room}`)
  })

  // ─── inbox:typing ────────────────────────────────────────────────────
  socket.on(
    'inbox:typing',
    (data: { conversationId: string; userId: string; userName?: string }) => {
      const { conversationId, userId, userName } = data
      if (!conversationId || !userId) return

      const key = typingKey(socket.id, conversationId)

      // Clear existing timeout if any
      const existing = typingEntries.get(key)
      if (existing) {
        clearTimeout(existing.timeout)
      }

      // Set new timeout — auto-clear after 3s
      const timeout = setTimeout(() => {
        typingEntries.delete(key)
        socket.to(getConversationRoom(conversationId)).emit('inbox:user-typing', {
          conversationId,
          userId,
          userName: userName ?? userId,
          isTyping: false,
        })
      }, TYPING_TIMEOUT_MS)

      typingEntries.set(key, {
        conversationId,
        userId,
        userName: userName ?? userId,
        timeout,
      })

      // Broadcast to others in the conversation room
      socket.to(getConversationRoom(conversationId)).emit('inbox:user-typing', {
        conversationId,
        userId,
        userName: userName ?? userId,
        isTyping: true,
      })
    }
  )

  // ─── inbox:viewing ───────────────────────────────────────────────────
  socket.on(
    'inbox:viewing',
    (data: { conversationId: string; userId: string; userName?: string }) => {
      const { conversationId, userId, userName } = data
      if (!conversationId || !userId) return

      const key = viewingKey(socket.id, conversationId)
      const resolvedName = userName ?? userId

      // Join the conversation room if not already
      const convRoom = getConversationRoom(conversationId)
      socket.join(convRoom)

      // Update/create viewing entry with TTL
      viewingEntries.set(key, {
        conversationId,
        userId,
        userName: resolvedName,
        expiresAt: Date.now() + VIEWING_TTL_MS,
      })

      // Track in conversation viewers set
      if (!conversationViewers.has(conversationId)) {
        conversationViewers.set(conversationId, new Set())
      }
      conversationViewers.get(conversationId)!.add(socket.id)

      // Broadcast to others in the conversation room
      socket.to(convRoom).emit('inbox:user-viewing', {
        conversationId,
        userId,
        userName: resolvedName,
      })

      // Also send the full list of current viewers back to the sender (collision detection)
      const otherViewerIds = getOtherViewerIds(conversationId, socket.id)
      const otherViewers = otherViewerIds
        .map((sid) => {
          const vEntry = viewingEntries.get(viewingKey(sid, conversationId))
          const user = connectedUsers.get(sid)
          if (vEntry) {
            return { userId: vEntry.userId, userName: vEntry.userName }
          }
          if (user) {
            return { userId: user.userId, userName: user.userName }
          }
          return null
        })
        .filter(Boolean) as { userId: string; userName: string }[]

      socket.emit('inbox:viewing-presence', {
        conversationId,
        viewers: otherViewers,
      })
    }
  )

  // ─── inbox:stop-viewing ──────────────────────────────────────────────
  socket.on(
    'inbox:stop-viewing',
    (data: { conversationId: string; userId: string; userName?: string }) => {
      const { conversationId, userId, userName } = data
      if (!conversationId || !userId) return

      const key = viewingKey(socket.id, conversationId)
      viewingEntries.delete(key)

      // Remove from conversation viewers set
      const viewers = conversationViewers.get(conversationId)
      if (viewers) {
        viewers.delete(socket.id)
        if (viewers.size === 0) {
          conversationViewers.delete(conversationId)
        }
      }

      // Leave the conversation room
      socket.leave(getConversationRoom(conversationId))

      // Broadcast to others
      socket.to(getConversationRoom(conversationId)).emit('inbox:user-stop-viewing', {
        conversationId,
        userId,
        userName: userName ?? userId,
      })
    }
  )

  // ─── disconnect ──────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const user = connectedUsers.get(socket.id)
    console.log(
      `[disconnected] socket=${socket.id} userId=${user?.userId ?? 'unknown'} reason=${reason}`
    )
    cleanupSocket(socket)
  })

  // ─── error ───────────────────────────────────────────────────────────
  socket.on('error', (error) => {
    console.error(`[error] socket=${socket.id}`, error)
  })
})

// ─── Server start ───────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[inbox-ws] WebSocket server running on port ${PORT}`)
})

// ─── Graceful shutdown ──────────────────────────────────────────────────────

function shutdown(): void {
  console.log('[inbox-ws] Shutting down...')

  // Clear all typing timeouts
  for (const entry of typingEntries.values()) {
    clearTimeout(entry.timeout)
  }

  io.disconnectSockets()
  httpServer.close(() => {
    console.log('[inbox-ws] Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
