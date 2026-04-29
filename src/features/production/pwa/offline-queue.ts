/**
 * Offline Queue — IndexedDB-backed action queue for offline-first PWA
 *
 * Stores user actions (create task, draft email, note) when offline,
 * then syncs them automatically when the network is restored.
 * Uses raw IndexedDB API (no external dependency) for maximum compatibility.
 */

export interface QueuedAction {
  id: string
  actionType: 'create_task' | 'update_task' | 'create_note' | 'create_email_draft' | 'create_time_entry' | 'update_project'
  entityType: 'task' | 'note' | 'email' | 'time_entry' | 'project'
  entityId?: string
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
}

const DB_NAME = 'burozen-offline'
const STORE_NAME = 'actions'
const DB_VERSION = 1
const MAX_QUEUE_SIZE = 100
const MAX_RETRIES = 5

/** Open or create the IndexedDB database */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('actionType', 'actionType', { unique: false })
      }
    }
  })
}

/** Generate a simple unique ID (no external dependency) */
function generateId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/** Get a transaction and object store */
async function getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, mode)
  return tx.objectStore(STORE_NAME)
}

/** Wrap an IDB request in a promise */
function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * OfflineQueue — manages the IndexedDB-backed queue of pending actions
 */
export class OfflineQueue {
  private syncInProgress = false
  private listeners: Set<(count: number) => void> = new Set()

  /** Add an action to the offline queue */
  async enqueue(
    actionType: QueuedAction['actionType'],
    entityType: QueuedAction['entityType'],
    payload: Record<string, unknown>,
    entityId?: string
  ): Promise<QueuedAction> {
    const store = await getStore('readwrite')

    // Check queue size — evict oldest if at capacity
    const count = await wrapRequest(store.count())
    if (count >= MAX_QUEUE_SIZE) {
      const index = store.index('createdAt')
      const cursor = await wrapRequest(index.openCursor())
      if (cursor) {
        await wrapRequest(store.delete(cursor.value.id))
      }
    }

    const action: QueuedAction = {
      id: generateId(),
      actionType,
      entityType,
      entityId,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    }

    await wrapRequest(store.add(action))
    this.notifyListeners()
    return action
  }

  /** Remove an action from the queue by ID */
  async dequeue(id: string): Promise<void> {
    const store = await getStore('readwrite')
    await wrapRequest(store.delete(id))
    this.notifyListeners()
  }

  /** Peek at the next action without removing it */
  async peek(): Promise<QueuedAction | null> {
    const store = await getStore('readonly')
    const index = store.index('createdAt')
    const cursor = await wrapRequest(index.openCursor())
    return cursor ? cursor.value : null
  }

  /** Get all queued actions, sorted by creation time */
  async getAll(): Promise<QueuedAction[]> {
    const store = await getStore('readonly')
    const index = store.index('createdAt')
    return new Promise((resolve, reject) => {
      const results: QueuedAction[] = []
      const request = index.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /** Get the number of pending actions */
  async count(): Promise<number> {
    const store = await getStore('readonly')
    return wrapRequest(store.count())
  }

  /** Clear all queued actions */
  async clear(): Promise<void> {
    const store = await getStore('readwrite')
    await wrapRequest(store.clear())
    this.notifyListeners()
  }

  /** Increment retry count on an action; remove if max retries exceeded */
  async incrementRetry(id: string): Promise<boolean> {
    const store = await getStore('readwrite')
    const action = await wrapRequest(store.get(id)) as QueuedAction | undefined
    if (!action) return false

    action.retryCount++
    if (action.retryCount >= MAX_RETRIES) {
      await wrapRequest(store.delete(id))
      this.notifyListeners()
      return false // removed
    }

    await wrapRequest(store.put(action))
    return true // still in queue
  }

  /**
   * Sync all queued actions to the server.
   * Returns the number of successfully synced actions.
   */
  async syncToServer(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress || !navigator.onLine) {
      return { synced: 0, failed: 0 }
    }

    this.syncInProgress = true
    let synced = 0
    let failed = 0

    try {
      const actions = await this.getAll()
      if (actions.length === 0) return { synced: 0, failed: 0 }

      // Batch sync — send all actions in one request
      const response = await fetch('/api/offline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: actions.map(a => ({
            actionType: a.actionType,
            entityType: a.entityType,
            entityId: a.entityId,
            payload: a.payload,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`)
      }

      const result = await response.json()

      // Process results
      for (let i = 0; i < actions.length; i++) {
        const actionResult = result.results?.[i]
        if (actionResult?.success) {
          await this.dequeue(actions[i].id)
          synced++
        } else {
          const stillQueued = await this.incrementRetry(actions[i].id)
          if (!stillQueued) failed++
          else failed++
        }
      }
    } catch (error) {
      console.error('[OfflineQueue] Sync error:', error)
      failed = await this.count()
    } finally {
      this.syncInProgress = false
      this.notifyListeners()
    }

    return { synced, failed }
  }

  /** Subscribe to queue count changes */
  onChange(callback: (count: number) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private async notifyListeners() {
    const count = await this.count()
    for (const listener of this.listeners) {
      try { listener(count) } catch { /* ignore */ }
    }
  }
}

/** Singleton instance */
let queueInstance: OfflineQueue | null = null

export function getOfflineQueue(): OfflineQueue {
  if (!queueInstance) {
    queueInstance = new OfflineQueue()

    // Auto-sync when coming back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineQueue] Network restored — syncing...')
        queueInstance?.syncToServer()
      })
    }
  }
  return queueInstance
}

/** Calculate exponential backoff delay in ms */
export function getBackoffDelay(retryCount: number): number {
  const baseDelay = 1000
  const maxDelay = 30000
  const delay = baseDelay * Math.pow(2, retryCount)
  return Math.min(delay, maxDelay)
}
