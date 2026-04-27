import { db } from '@/lib/db'

// ─── Helper date functions ──────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function hoursFromNow(hours: number): Date {
  const d = new Date()
  d.setTime(d.getTime() + hours * 60 * 60 * 1000)
  return d
}

function hoursAgo(hours: number): Date {
  const d = new Date()
  d.setTime(d.getTime() - hours * 60 * 60 * 1000)
  return d
}

// ─── Default automation preferences ─────────────────────────────────────────────

export const DEFAULT_AUTOMATION_PREFS = [
  {
    type: 'overdue_tasks',
    enabled: true,
    channel: 'in_app',
    frequency: '15min',
    threshold: 1, // days overdue before alerting
  },
  {
    type: 'unpaid_invoices',
    enabled: true,
    channel: 'in_app',
    frequency: 'daily',
    threshold: 7, // days past due before alerting
  },
  {
    type: 'meeting_reminder',
    enabled: true,
    channel: 'in_app',
    frequency: '15min',
    threshold: 1, // hours before meeting to remind
  },
  {
    type: 'email_followup',
    enabled: true,
    channel: 'in_app',
    frequency: 'daily',
    threshold: 3, // days without reply before alerting
  },
] as const

export type AutomationType = 'overdue_tasks' | 'unpaid_invoices' | 'meeting_reminder' | 'email_followup'

// ─── Ensure default preferences exist for a user ────────────────────────────────

export async function ensureDefaultPreferences(userId: string) {
  const existing = await db.automationPreference.findMany({ where: { userId } })

  if (existing.length > 0) return existing

  // Create all default preferences
  const created = await Promise.all(
    DEFAULT_AUTOMATION_PREFS.map((pref) =>
      db.automationPreference.create({
        data: {
          type: pref.type,
          enabled: pref.enabled,
          channel: pref.channel,
          frequency: pref.frequency,
          threshold: pref.threshold,
          userId,
        },
      })
    )
  )

  return created
}

// ─── Check for recent duplicate automation logs ─────────────────────────────────

async function hasRecentLog(userId: string, type: string, relatedId: string, withinMinutes: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000)
  const existing = await db.automationLog.findFirst({
    where: {
      userId,
      type,
      relatedId,
      success: true,
      createdAt: { gte: cutoff },
    },
  })
  return !!existing
}

// ─── Individual check functions ─────────────────────────────────────────────────

interface CheckResult {
  type: AutomationType
  found: number
  notified: number
  errors: number
  details: Array<{ id: string; title: string; message: string }>
}

async function checkOverdueTasks(userId: string, threshold: number, channel: string): Promise<CheckResult> {
  const result: CheckResult = { type: 'overdue_tasks', found: 0, notified: 0, errors: 0, details: [] }

  // Tasks where dueDate < now AND status is not done/completed
  const overdueTasks = await db.task.findMany({
    where: {
      userId,
      dueDate: { lt: new Date(), not: null },
      status: { notIn: ['done', 'completed'] },
    },
    orderBy: { dueDate: 'asc' },
  })

  result.found = overdueTasks.length

  for (const task of overdueTasks) {
    // Only notify if overdue by at least threshold days
    const daysOverdue = Math.floor((Date.now() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24))
    if (daysOverdue < threshold) continue

    // Avoid duplicate notifications within the last 4 hours
    const duplicate = await hasRecentLog(userId, 'overdue_tasks', task.id, 240)
    if (duplicate) continue

    const message = `La tâche "${task.title}" est en retard depuis ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}.`

    try {
      await db.notification.create({
        data: {
          title: 'Tâche en retard',
          message,
          type: 'warning',
          channel,
          actionUrl: `/tasks?id=${task.id}`,
          userId,
        },
      })

      await db.automationLog.create({
        data: {
          type: 'overdue_tasks',
          action: 'notification_sent',
          details: JSON.stringify({ taskId: task.id, taskTitle: task.title, daysOverdue }),
          relatedId: task.id,
          success: true,
          userId,
        },
      })

      result.notified++
      result.details.push({ id: task.id, title: task.title, message })
    } catch (error) {
      console.error(`Failed to notify overdue task ${task.id}:`, error)
      await db.automationLog.create({
        data: {
          type: 'overdue_tasks',
          action: 'notification_sent',
          details: JSON.stringify({ taskId: task.id, error: String(error) }),
          relatedId: task.id,
          success: false,
          userId,
        },
      })
      result.errors++
    }
  }

  return result
}

async function checkUnpaidInvoices(userId: string, threshold: number, channel: string): Promise<CheckResult> {
  const result: CheckResult = { type: 'unpaid_invoices', found: 0, notified: 0, errors: 0, details: [] }

  // Invoices where status = 'sent' AND dueDate < now - threshold days
  const thresholdDate = daysAgo(threshold)
  const unpaidInvoices = await db.invoice.findMany({
    where: {
      userId,
      status: 'sent',
      dueDate: { lt: thresholdDate, not: null },
    },
    orderBy: { dueDate: 'asc' },
  })

  result.found = unpaidInvoices.length

  for (const invoice of unpaidInvoices) {
    // Avoid duplicate notifications within the last 24 hours
    const duplicate = await hasRecentLog(userId, 'unpaid_invoices', invoice.id, 1440)
    if (duplicate) continue

    const daysPastDue = Math.floor((Date.now() - invoice.dueDate!.getTime()) / (1000 * 60 * 60 * 24))
    const message = `La facture ${invoice.number} (${invoice.clientName}) de ${invoice.total} ${invoice.currency} est impayée depuis ${daysPastDue} jour${daysPastDue > 1 ? 's' : ''}.`

    try {
      await db.notification.create({
        data: {
          title: 'Facture impayée',
          message,
          type: 'warning',
          channel,
          actionUrl: `/invoices?id=${invoice.id}`,
          userId,
        },
      })

      await db.automationLog.create({
        data: {
          type: 'unpaid_invoices',
          action: 'notification_sent',
          details: JSON.stringify({
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            clientName: invoice.clientName,
            total: invoice.total,
            currency: invoice.currency,
            daysPastDue,
          }),
          relatedId: invoice.id,
          success: true,
          userId,
        },
      })

      result.notified++
      result.details.push({ id: invoice.id, title: `Facture ${invoice.number}`, message })
    } catch (error) {
      console.error(`Failed to notify unpaid invoice ${invoice.id}:`, error)
      await db.automationLog.create({
        data: {
          type: 'unpaid_invoices',
          action: 'notification_sent',
          details: JSON.stringify({ invoiceId: invoice.id, error: String(error) }),
          relatedId: invoice.id,
          success: false,
          userId,
        },
      })
      result.errors++
    }
  }

  return result
}

async function checkUpcomingMeetings(userId: string, threshold: number, channel: string): Promise<CheckResult> {
  const result: CheckResult = { type: 'meeting_reminder', found: 0, notified: 0, errors: 0, details: [] }

  // Meetings in the next 24 hours with status 'scheduled'
  const now = new Date()
  const soon = hoursFromNow(24)
  const upcomingMeetings = await db.meeting.findMany({
    where: {
      userId,
      status: 'scheduled',
      startDate: { gte: now, lte: soon },
    },
    orderBy: { startDate: 'asc' },
  })

  result.found = upcomingMeetings.length

  for (const meeting of upcomingMeetings) {
    // Only remind if meeting is within threshold hours from now
    const hoursUntil = (meeting.startDate.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil > threshold) continue

    // Avoid duplicate notifications within the last 30 minutes
    const duplicate = await hasRecentLog(userId, 'meeting_reminder', meeting.id, 30)
    if (duplicate) continue

    const formattedTime = meeting.startDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const formattedDate = meeting.startDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    })

    const timeLabel = hoursUntil <= 1
      ? `dans ${Math.max(1, Math.round(hoursUntil * 60))} min`
      : `aujourd'hui à ${formattedTime}`

    const message = `"${meeting.title}" prévu ${timeLabel} (${formattedDate}).`

    try {
      await db.notification.create({
        data: {
          title: 'Rappel réunion',
          message,
          type: 'info',
          channel,
          actionUrl: `/meetings?id=${meeting.id}`,
          userId,
        },
      })

      // Also create a Reminder
      await db.reminder.create({
        data: {
          title: `Rappel: ${meeting.title}`,
          message,
          remindAt: new Date(meeting.startDate.getTime() - 15 * 60 * 1000), // 15 min before
          type: channel,
          relatedId: meeting.id,
          relatedType: 'meeting',
          userId,
        },
      })

      await db.automationLog.create({
        data: {
          type: 'meeting_reminder',
          action: 'reminder_created',
          details: JSON.stringify({
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            startDate: meeting.startDate.toISOString(),
            hoursUntil: Math.round(hoursUntil * 10) / 10,
          }),
          relatedId: meeting.id,
          success: true,
          userId,
        },
      })

      result.notified++
      result.details.push({ id: meeting.id, title: meeting.title, message })
    } catch (error) {
      console.error(`Failed to remind meeting ${meeting.id}:`, error)
      await db.automationLog.create({
        data: {
          type: 'meeting_reminder',
          action: 'reminder_created',
          details: JSON.stringify({ meetingId: meeting.id, error: String(error) }),
          relatedId: meeting.id,
          success: false,
          userId,
        },
      })
      result.errors++
    }
  }

  return result
}

async function checkUnansweredEmails(userId: string, threshold: number, channel: string): Promise<CheckResult> {
  const result: CheckResult = { type: 'email_followup', found: 0, notified: 0, errors: 0, details: [] }

  // Sent emails older than threshold days with no task created from them
  const cutoffDate = hoursAgo(threshold * 24)
  const oldSentEmails = await db.email.findMany({
    where: {
      userId,
      isSent: true,
      hasTask: false,
      createdAt: { lt: cutoffDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to most recent 50 to avoid overload
  })

  result.found = oldSentEmails.length

  for (const email of oldSentEmails) {
    // Avoid duplicate notifications within the last 24 hours
    const duplicate = await hasRecentLog(userId, 'email_followup', email.id, 1440)
    if (duplicate) continue

    const daysSinceSent = Math.floor((Date.now() - email.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const subject = email.subject.length > 60 ? email.subject.substring(0, 57) + '...' : email.subject
    const message = `Aucune réponse depuis ${daysSinceSent} jour${daysSinceSent > 1 ? 's' : ''} pour "${subject}" (envoyé à ${email.toAddress}).`

    try {
      await db.notification.create({
        data: {
          title: 'Relance e-mail',
          message,
          type: 'info',
          channel,
          actionUrl: `/emails?id=${email.id}`,
          userId,
        },
      })

      await db.automationLog.create({
        data: {
          type: 'email_followup',
          action: 'notification_sent',
          details: JSON.stringify({
            emailId: email.id,
            subject: email.subject,
            toAddress: email.toAddress,
            daysSinceSent,
          }),
          relatedId: email.id,
          success: true,
          userId,
        },
      })

      result.notified++
      result.details.push({ id: email.id, title: subject, message })
    } catch (error) {
      console.error(`Failed to notify email followup ${email.id}:`, error)
      await db.automationLog.create({
        data: {
          type: 'email_followup',
          action: 'notification_sent',
          details: JSON.stringify({ emailId: email.id, error: String(error) }),
          relatedId: email.id,
          success: false,
          userId,
        },
      })
      result.errors++
    }
  }

  return result
}

// ─── Main automation check runner ───────────────────────────────────────────────

export interface AutomationCheckSummary {
  ranAt: string
  results: CheckResult[]
  totalFound: number
  totalNotified: number
  totalErrors: number
}

export async function runAutomationChecks(userId: string): Promise<AutomationCheckSummary> {
  // Ensure preferences exist
  const prefs = await ensureDefaultPreferences(userId)

  const results: CheckResult[] = []
  let totalFound = 0
  let totalNotified = 0
  let totalErrors = 0

  for (const pref of prefs) {
    if (!pref.enabled) continue

    let checkResult: CheckResult

    switch (pref.type as AutomationType) {
      case 'overdue_tasks':
        checkResult = await checkOverdueTasks(userId, pref.threshold, pref.channel)
        break
      case 'unpaid_invoices':
        checkResult = await checkUnpaidInvoices(userId, pref.threshold, pref.channel)
        break
      case 'meeting_reminder':
        checkResult = await checkUpcomingMeetings(userId, pref.threshold, pref.channel)
        break
      case 'email_followup':
        checkResult = await checkUnansweredEmails(userId, pref.threshold, pref.channel)
        break
      default:
        continue
    }

    results.push(checkResult)
    totalFound += checkResult.found
    totalNotified += checkResult.notified
    totalErrors += checkResult.errors
  }

  return {
    ranAt: new Date().toISOString(),
    results,
    totalFound,
    totalNotified,
    totalErrors,
  }
}
