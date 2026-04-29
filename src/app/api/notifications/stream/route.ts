import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface SSEEvent {
  type: string
  payload: Record<string, unknown>
}

function serializeEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

function serializeComment(comment: string): string {
  return `: ${comment}\n\n`
}

async function checkDueReminders(userId: string): Promise<SSEEvent[]> {
  const now = new Date()
  const dueReminders = await db.reminder.findMany({
    where: {
      userId,
      isSent: false,
      remindAt: { lte: now },
    },
    take: 10,
  })

  return dueReminders.map((r) => ({
    type: 'reminder_due',
    payload: {
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      relatedId: r.relatedId,
      relatedType: r.relatedType,
    },
  }))
}

async function checkApproachingDeadlines(userId: string): Promise<SSEEvent[]> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const approachingTasks = await db.task.findMany({
    where: {
      userId,
      status: { not: 'done' },
      dueDate: {
        gte: now,
        lte: in24h,
      },
    },
    take: 10,
  })

  return approachingTasks.map((t) => ({
    type: 'task_deadline_approaching',
    payload: {
      id: t.id,
      title: t.title,
      dueDate: t.dueDate?.toISOString(),
      priority: t.priority,
    },
  }))
}

async function checkOverdueInvoices(userId: string): Promise<SSEEvent[]> {
  const now = new Date()

  const overdueInvoices = await db.invoice.findMany({
    where: {
      userId,
      status: 'sent',
      dueDate: { lt: now },
    },
    take: 10,
  })

  return overdueInvoices.map((inv) => ({
    type: 'invoice_overdue',
    payload: {
      id: inv.id,
      number: inv.number,
      clientName: inv.clientName,
      total: inv.total,
      currency: inv.currency,
      dueDate: inv.dueDate?.toISOString(),
    },
  }))
}

async function checkUnreadEmails(userId: string): Promise<SSEEvent[]> {
  const unreadCount = await db.email.count({
    where: {
      userId,
      isRead: false,
      isSent: false,
    },
  })

  if (unreadCount === 0) return []

  return [
    {
      type: 'unread_emails',
      payload: { count: unreadCount },
    },
  ]
}

async function checkPendingNotifications(userId: string): Promise<SSEEvent[]> {
  const pending = await db.notification.findMany({
    where: {
      userId,
      isRead: false,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return pending.map((n) => ({
    type: 'notification_pending',
    payload: {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      actionUrl: n.actionUrl,
      createdAt: n.createdAt.toISOString(),
    },
  }))
}

export async function GET(request: Request) {
  const encoder = new TextEncoder()

  // Find the user (single-user app for now)
  const user = await db.user.findFirst()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = user.id

  let isClosed = false
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let checkInterval: ReturnType<typeof setInterval> | null = null

  const cleanup = () => {
    isClosed = true
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    if (checkInterval) clearInterval(checkInterval)
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(serializeEvent({
        type: 'connected',
        payload: { message: 'SSE connection established' },
      })))

      // Check for pending notifications on connect
      try {
        const pending = await checkPendingNotifications(userId)
        if (!isClosed) {
          for (const event of pending) {
            controller.enqueue(encoder.encode(serializeEvent(event)))
          }
        }
      } catch (err) {
        console.error('SSE: Error checking pending notifications:', err)
      }

      // Heartbeat interval (every 15 seconds)
      heartbeatInterval = setInterval(() => {
        if (isClosed) { clearInterval(heartbeatInterval!); return }
        try {
          controller.enqueue(encoder.encode(serializeComment('heartbeat')))
        } catch {
          cleanup()
        }
      }, 15000)

      // Check interval (every 30 seconds)
      checkInterval = setInterval(async () => {
        if (isClosed) { clearInterval(checkInterval!); return }
        try {
          const events: SSEEvent[] = []

          // Check due reminders
          const reminderEvents = await checkDueReminders(userId)
          events.push(...reminderEvents)

          // Check approaching task deadlines
          const deadlineEvents = await checkApproachingDeadlines(userId)
          events.push(...deadlineEvents)

          // Check overdue invoices
          const invoiceEvents = await checkOverdueInvoices(userId)
          events.push(...invoiceEvents)

          // Check unread emails
          const emailEvents = await checkUnreadEmails(userId)
          events.push(...emailEvents)

          // Send all events (guard against closed stream)
          if (!isClosed) {
            for (const event of events) {
              controller.enqueue(encoder.encode(serializeEvent(event)))
            }
          }

          // Mark sent reminders only if we actually sent them
          if (!isClosed && reminderEvents.length > 0) {
            const reminderIds = reminderEvents.map((e) => e.payload.id as string)
            await db.reminder.updateMany({
              where: { id: { in: reminderIds }, userId },
              data: { isSent: true },
            })
          }
        } catch (err) {
          if (!isClosed) console.error('SSE: Error in check interval:', err)
        }
      }, 30000)

      // Handle abort signal (client disconnect)
      const signal = request.signal
      const onAbort = () => {
        cleanup()
        try { controller.close() } catch { /* Already closed */ }
      }

      signal.addEventListener('abort', onAbort, { once: true })
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
