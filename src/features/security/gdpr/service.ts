/**
 * GDPR Service — Data export, account deletion, and consent management
 * Implements GDPR Articles 15-22 (Right to access, rectification, erasure, portability)
 *
 * Features:
 *  - exportUserData: Collect ALL user data from every table (Art. 15, 20)
 *  - requestAccountDeletion: 30-day grace period with email anonymization (Art. 17)
 *  - confirmAccountDeletion: Double confirmation
 *  - cancelAccountDeletion: Restore within grace period
 *  - executePendingDeletions: Cron-triggered full anonymization
 *  - logConsent / getUserConsents: Consent tracking (Art. 7)
 */

import { db } from '@/lib/db'
import { logSecurityAction } from '@/features/security/audit/logger'

// ─── Data Export (Art. 15 & 20 — Right to Access & Portability) ─────────────

export interface UserDataExport {
  exportedAt: string
  userId: string
  sections: {
    profile?: Record<string, unknown>
    projects?: unknown[]
    tasks?: unknown[]
    events?: unknown[]
    reminders?: unknown[]
    emails?: unknown[]
    emailAccounts?: unknown[]
    invoices?: unknown[]
    timeEntries?: unknown[]
    documents?: unknown[]
    snippets?: unknown[]
    contracts?: unknown[]
    meetings?: unknown[]
    notifications?: unknown[]
    goals?: unknown[]
    chatMessages?: unknown[]
    templates?: unknown[]
    automationPreferences?: unknown[]
    automationLogs?: unknown[]
    tags?: unknown[]
    modules?: unknown[]
    integrations?: unknown[]
    focusSessions?: unknown[]
    voiceLogs?: unknown[]
    teamMemberships?: unknown[]
    auditLogs?: unknown[]
    consentLogs?: unknown[]
    gdprRequests?: unknown[]
    subscriptions?: unknown[]
    backupCodes?: unknown[]
    portalInvites?: unknown[]
  }
}

/**
 * Export ALL user data from every table.
 * Returns structured JSON for GDPR data portability.
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  // Fetch user profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      profession: true,
      timezone: true,
      assistantName: true,
      assistantTone: true,
      theme: true,
      focusMode: true,
      onboardingDone: true,
      hourlyRate: true,
      weeklyTargetHours: true,
      weeklyTargetRevenue: true,
      maxDailyHours: true,
      role: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      // Never export: passwordHash, twoFactorSecret, stripeAccountId, stripeCustomerId
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Parallel data fetch from all tables
  const [
    projects,
    tasks,
    events,
    reminders,
    emailAccounts,
    emails,
    invoices,
    timeEntries,
    documents,
    snippets,
    contracts,
    meetings,
    notifications,
    goals,
    chatMessages,
    templates,
    automationPrefs,
    automationLogs,
    tags,
    userModules,
    integrations,
    focusSessions,
    voiceLogs,
    teamMemberships,
    auditLogs,
    consentLogs,
    gdprRequests,
    subscriptions,
    backupCodes,
    portalInvites,
  ] = await Promise.all([
    db.project.findMany({ where: { userId } }),
    db.task.findMany({ where: { userId } }),
    db.calendarEvent.findMany({ where: { userId } }),
    db.reminder.findMany({ where: { userId } }),
    db.emailAccount.findMany({
      where: { userId },
      select: {
        id: true, provider: true, email: true, isPrimary: true,
        imapHost: true, imapPort: true, smtpHost: true, smtpPort: true,
        createdAt: true, updatedAt: true,
        // Never export: accessToken, refreshToken, tokenExpiry
      },
    }),
    db.email.findMany({
      where: { emailAccount: { userId } },
      select: {
        id: true, fromAddress: true, fromName: true, toAddress: true,
        subject: true, snippet: true, isRead: true, isStarred: true,
        isSent: true, category: true, scheduledAt: true, createdAt: true, updatedAt: true,
        // Never export: body (may contain sensitive client data)
      },
    }),
    db.invoice.findMany({ where: { userId } }),
    db.timeEntry.findMany({ where: { userId } }),
    db.document.findMany({
      where: { userId },
      select: {
        id: true, name: true, type: true, mimeType: true, size: true,
        projectId: true, createdAt: true, updatedAt: true,
        // Never export: content, fileUrl (may contain sensitive data)
      },
    }),
    db.snippet.findMany({ where: { userId } }),
    db.contract.findMany({ where: { userId } }),
    db.meeting.findMany({ where: { userId } }),
    db.notification.findMany({ where: { userId } }),
    db.weeklyGoal.findMany({ where: { userId } }),
    db.chatMessage.findMany({ where: { userId } }),
    db.template.findMany({ where: { userId } }),
    db.automationPreference.findMany({ where: { userId } }),
    db.automationLog.findMany({ where: { userId } }),
    db.tag.findMany({ where: { userId } }),
    db.userModule.findMany({ where: { userId } }),
    db.integrationConnection.findMany({
      where: { userId },
      select: {
        id: true, provider: true, status: true, scopes: true,
        lastSyncAt: true, createdAt: true, updatedAt: true,
        // Never export: accessToken, refreshToken, metadata
      },
    }),
    db.focusSession.findMany({ where: { userId } }),
    db.voiceLog.findMany({ where: { userId } }),
    db.teamMember.findMany({ where: { userId } }),
    db.auditLog.findMany({ where: { userId } }),
    db.consentLog.findMany({ where: { userId } }),
    db.gdprRequest.findMany({ where: { userId } }),
    db.subscription.findMany({ where: { userId } }),
    db.backupCode.findMany({
      where: { userId },
      select: {
        id: true, usedAt: true, createdAt: true,
        // Never export: codeHash
      },
    }),
    db.portalInvite.findMany({
      where: { createdById: userId },
      select: {
        id: true, email: true, clientName: true, expiresAt: true,
        accessedAt: true, accessCount: true, isActive: true, createdAt: true,
        // Never export: token
      },
    }),
  ])

  // Create a GdprRequest record for this export
  await db.gdprRequest.create({
    data: {
      userId,
      type: 'export',
      status: 'completed',
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: JSON.stringify({ sectionCount: 21 }),
    },
  })

  // Log the export action
  await logSecurityAction({
    userId,
    action: 'gdpr.export',
    target: 'user',
    targetId: userId,
    metadata: { sectionCount: 21 },
  })

  return {
    exportedAt: new Date().toISOString(),
    userId,
    sections: {
      profile: user,
      projects,
      tasks,
      events,
      reminders,
      emailAccounts,
      emails,
      invoices,
      timeEntries,
      documents,
      snippets,
      contracts,
      meetings,
      notifications,
      goals,
      chatMessages,
      templates,
      automationPreferences: automationPrefs,
      automationLogs,
      tags,
      modules: userModules,
      integrations,
      focusSessions,
      voiceLogs,
      teamMemberships,
      auditLogs,
      consentLogs,
      gdprRequests,
      subscriptions,
      backupCodes,
      portalInvites,
    },
  }
}

// ─── Account Deletion (Art. 17 — Right to Erasure) ──────────────────────────

const GRACE_PERIOD_DAYS = 30
const ANONYMIZED_EMAIL_PREFIX = 'anonymized_'

/**
 * Request account deletion — creates a 30-day grace period schedule.
 * Immediately anonymizes the email so the user cannot log in,
 * but retains data until the grace period expires and confirmation is given.
 */
export async function requestAccountDeletion(
  userId: string,
  ipAddress: string
): Promise<{ gracePeriodEnd: Date; scheduleId: string }> {
  // Check if a deletion schedule already exists
  const existingSchedule = await db.gdprDeletionSchedule.findUnique({
    where: { userId },
  })

  if (existingSchedule) {
    if (existingSchedule.status === 'executed') {
      throw new Error('Account has already been deleted')
    }
    if (existingSchedule.status === 'pending' || existingSchedule.status === 'confirmed') {
      throw new Error('A deletion request is already pending for this account')
    }
  }

  // Get current user email for anonymization
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new Error('User not found')
  }

  const anonymizedEmail = `${ANONYMIZED_EMAIL_PREFIX}${userId}@burofree.anonymized`
  const gracePeriodEnd = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  // Store original email in the schedule metadata for potential restoration
  const schedule = await db.gdprDeletionSchedule.create({
    data: {
      userId,
      gracePeriodEnd,
      status: 'pending',
      ipAddress,
    },
  })

  // Immediately anonymize email so user can't login
  await db.user.update({
    where: { id: userId },
    data: { email: anonymizedEmail },
  })

  // Also create a GdprRequest record
  await db.gdprRequest.create({
    data: {
      userId,
      type: 'delete',
      status: 'pending',
      metadata: JSON.stringify({
        originalEmail: user.email,
        scheduleId: schedule.id,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
      }),
    },
  })

  // Log the action
  await logSecurityAction({
    userId,
    action: 'gdpr.deletion.requested',
    target: 'user',
    targetId: userId,
    metadata: {
      originalEmail: user.email,
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      ip: ipAddress,
    },
  })

  return { gracePeriodEnd, scheduleId: schedule.id }
}

/**
 * Confirm account deletion — requires double confirmation.
 * The account will be deleted when executePendingDeletions runs after gracePeriodEnd.
 */
export async function confirmAccountDeletion(userId: string): Promise<void> {
  const schedule = await db.gdprDeletionSchedule.findUnique({
    where: { userId },
  })

  if (!schedule) {
    throw new Error('No deletion schedule found for this account')
  }

  if (schedule.status !== 'pending') {
    throw new Error(`Cannot confirm deletion: current status is '${schedule.status}'`)
  }

  await db.gdprDeletionSchedule.update({
    where: { id: schedule.id },
    data: {
      status: 'confirmed',
      confirmedAt: new Date(),
    },
  })

  // Update the GdprRequest status
  await db.gdprRequest.updateMany({
    where: { userId, type: 'delete', status: 'pending' },
    data: { status: 'processing' },
  })

  // Log the action
  await logSecurityAction({
    userId,
    action: 'gdpr.deletion.confirmed',
    target: 'user',
    targetId: userId,
    metadata: { gracePeriodEnd: schedule.gracePeriodEnd.toISOString() },
  })
}

/**
 * Cancel account deletion within the grace period.
 * Restores the user's original email so they can log in again.
 */
export async function cancelAccountDeletion(userId: string): Promise<void> {
  const schedule = await db.gdprDeletionSchedule.findUnique({
    where: { userId },
  })

  if (!schedule) {
    throw new Error('No deletion schedule found for this account')
  }

  if (schedule.status === 'executed') {
    throw new Error('Account has already been deleted and cannot be restored')
  }

  if (schedule.status === 'cancelled') {
    throw new Error('Deletion has already been cancelled')
  }

  // Find the original email from the GdprRequest metadata
  const gdprRequest = await db.gdprRequest.findFirst({
    where: { userId, type: 'delete' },
    orderBy: { requestedAt: 'desc' },
  })

  let originalEmail: string | null = null
  if (gdprRequest?.metadata) {
    try {
      const metadata = JSON.parse(gdprRequest.metadata as string)
      originalEmail = metadata.originalEmail || null
    } catch {
      // Ignore parse errors
    }
  }

  // Cancel the schedule
  await db.gdprDeletionSchedule.update({
    where: { id: schedule.id },
    data: { status: 'cancelled' },
  })

  // Restore original email if available
  if (originalEmail) {
    await db.user.update({
      where: { id: userId },
      data: { email: originalEmail },
    })
  }

  // Update GdprRequest
  if (gdprRequest) {
    await db.gdprRequest.update({
      where: { id: gdprRequest.id },
      data: { status: 'expired' },
    })
  }

  // Log the action
  await logSecurityAction({
    userId,
    action: 'gdpr.deletion.cancelled',
    target: 'user',
    targetId: userId,
    metadata: { emailRestored: !!originalEmail },
  })
}

/**
 * Execute pending deletions — called by cron.
 * Finds schedules past their grace period with status='confirmed'
 * and anonymizes all user data.
 */
export async function executePendingDeletions(): Promise<{ deletedCount: number }> {
  const now = new Date()

  // Find schedules past grace period that are confirmed
  const schedules = await db.gdprDeletionSchedule.findMany({
    where: {
      status: 'confirmed',
      gracePeriodEnd: { lte: now },
    },
  })

  if (schedules.length === 0) {
    return { deletedCount: 0 }
  }

  for (const schedule of schedules) {
    try {
      await anonymizeUserData(schedule.userId)

      // Mark schedule as executed
      await db.gdprDeletionSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'executed',
          executedAt: new Date(),
        },
      })

      // Update GdprRequest
      await db.gdprRequest.updateMany({
        where: { userId: schedule.userId, type: 'delete' },
        data: { status: 'completed', completedAt: new Date() },
      })

      // Log
      await logSecurityAction({
        userId: schedule.userId,
        action: 'gdpr.deletion.executed',
        target: 'user',
        targetId: schedule.userId,
      })
    } catch (error) {
      console.error(`Failed to execute deletion for user ${schedule.userId}:`, error)
    }
  }

  return { deletedCount: schedules.length }
}

/**
 * Anonymize all user data — replace PII with anonymized values.
 * Retains the user record for referential integrity but strips all identifiable data.
 */
async function anonymizeUserData(userId: string): Promise<void> {
  const anonymousName = 'Utilisateur supprimé'
  const anonymousStr = '[supprimé]'

  // Update user record
  await db.user.update({
    where: { id: userId },
    data: {
      name: anonymousName,
      avatar: null,
      passwordHash: null,
      profession: null,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      suspendedAt: new Date(),
    },
  })

  // Anonymize projects
  await db.project.updateMany({
    where: { userId },
    data: { clientName: anonymousStr, description: anonymousStr },
  })

  // Anonymize tasks
  await db.task.updateMany({
    where: { userId },
    data: { description: anonymousStr },
  })

  // Anonymize email accounts (remove tokens)
  await db.emailAccount.updateMany({
    where: { userId },
    data: {
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
    },
  })

  // Anonymize emails
  await db.email.updateMany({
    where: { emailAccount: { userId } },
    data: { body: anonymousStr, snippet: anonymousStr },
  })

  // Anonymize invoices
  await db.invoice.updateMany({
    where: { userId },
    data: {
      clientEmail: null,
      clientAddress: anonymousStr,
      notes: anonymousStr,
      stripePaymentIntentId: null,
      stripeCheckoutUrl: null,
    },
  })

  // Anonymize documents
  await db.document.updateMany({
    where: { userId },
    data: { content: null, fileUrl: null },
  })

  // Anonymize contracts
  await db.contract.updateMany({
    where: { userId },
    data: {
      clientEmail: null,
      clientAddress: anonymousStr,
      terms: anonymousStr,
      notes: anonymousStr,
      fileUrl: null,
    },
  })

  // Anonymize meetings
  await db.meeting.updateMany({
    where: { userId },
    data: {
      description: anonymousStr,
      notes: anonymousStr,
      meetingUrl: null,
    },
  })

  // Anonymize chat messages
  await db.chatMessage.updateMany({
    where: { userId },
    data: { content: anonymousStr },
  })

  // Anonymize snippets
  await db.snippet.updateMany({
    where: { userId },
    data: { content: anonymousStr },
  })

  // Remove integration tokens
  await db.integrationConnection.updateMany({
    where: { userId },
    data: {
      accessToken: null,
      refreshToken: null,
      metadata: '{}',
    },
  })

  // Remove push subscriptions
  await db.pushSubscription.deleteMany({ where: { userId } })

  // Remove sessions (force logout)
  await db.session.deleteMany({ where: { userId } })

  // Remove OAuth accounts
  await db.account.deleteMany({ where: { userId } })

  // Remove backup codes
  await db.backupCode.deleteMany({ where: { userId } })

  // Remove portal invite tokens
  await db.portalInvite.updateMany({
    where: { createdById: userId },
    data: { token: `anonymized_${userId}`, isActive: false },
  })
}

// ─── Consent Management (Art. 7 — Conditions for Consent) ───────────────────

const VALID_CONSENT_TYPES = ['analytics', 'functional', 'marketing', 'essential'] as const
type ConsentType = (typeof VALID_CONSENT_TYPES)[number]

const CONSENT_POLICY_VERSION = '1.0'

/**
 * Log a consent action for a user.
 * Each consent change creates a new ConsentLog entry (append-only for audit trail).
 */
export async function logConsent(
  userId: string,
  consentType: string,
  action: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  if (!VALID_CONSENT_TYPES.includes(consentType as ConsentType)) {
    throw new Error(`Invalid consent type: ${consentType}. Valid types: ${VALID_CONSENT_TYPES.join(', ')}`)
  }

  if (!['granted', 'revoked', 'updated'].includes(action)) {
    throw new Error(`Invalid consent action: ${action}. Valid actions: granted, revoked, updated`)
  }

  await db.consentLog.create({
    data: {
      userId,
      consentType,
      action,
      version: CONSENT_POLICY_VERSION,
      ipAddress,
      userAgent,
    },
  })

  // Log the action
  await logSecurityAction({
    userId,
    action: `consent.${action}`,
    target: 'consent',
    targetId: consentType,
    metadata: { consentType, action, version: CONSENT_POLICY_VERSION },
  })
}

/**
 * Get the latest consent state per type for a user.
 * Returns the most recent action for each consent type.
 */
export async function getUserConsents(userId: string): Promise<Record<string, boolean>> {
  const consentLogs = await db.consentLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  // Build latest state per type
  const latestState: Record<string, boolean> = {}
  const seenTypes = new Set<string>()

  for (const log of consentLogs) {
    if (seenTypes.has(log.consentType)) continue
    seenTypes.add(log.consentType)

    latestState[log.consentType] = log.action === 'granted' || log.action === 'updated'
  }

  // Essential consent is always granted
  latestState['essential'] = true

  return latestState
}

/**
 * Get the deletion schedule for a user (if any)
 */
export async function getDeletionSchedule(userId: string) {
  return db.gdprDeletionSchedule.findUnique({
    where: { userId },
  })
}
