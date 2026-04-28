/**
 * Email Service — Unified Email Sending for Maellis
 *
 * Central service that:
 *  - Checks if SMTP is enabled before sending
 *  - Renders templates and sends via SMTP
 *  - Logs email activity to AutomationLog
 *  - Provides a simple API for all notification types
 *
 * Usage:
 *   import { emailService } from '@/lib/email'
 *   await emailService.sendWelcome({ name: 'John', email: 'john@example.com' })
 */

import { sendEmail, isSmtpEnabled, type EmailSendResult } from './smtp'
import {
  welcomeEmail,
  invoiceEmail,
  reminderEmail,
  notificationEmail,
  passwordResetEmail,
  teamInviteEmail,
  weeklySummaryEmail,
} from './templates'
import { db } from '@/lib/db'

// ─── Email Service Class ──────────────────────────────────────────────────────────

class EmailService {
  /**
   * Check if email notifications are enabled and configured.
   */
  async isEnabled(): Promise<boolean> {
    return isSmtpEnabled()
  }

  /**
   * Send a welcome email to a new user.
   */
  async sendWelcome(params: { name: string; email: string }): Promise<EmailSendResult> {
    const template = welcomeEmail(params)
    const result = await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await this.logEmail('welcome', params.email, result)
    return result
  }

  /**
   * Send an invoice email to a client.
   */
  async sendInvoice(params: {
    clientName: string
    clientEmail: string
    freelancerName: string
    invoiceNumber: string
    amount: string
    currency: string
    dueDate?: string
    invoiceType: 'invoice' | 'quote'
    paymentUrl?: string
    userId: string
  }): Promise<EmailSendResult> {
    const template = invoiceEmail(params)
    const result = await sendEmail({
      to: params.clientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await this.logEmail('invoice', params.clientEmail, result, params.userId)
    return result
  }

  /**
   * Send a reminder email.
   */
  async sendReminder(params: {
    userName: string
    email: string
    reminderTitle: string
    reminderMessage: string
    reminderType: 'task' | 'invoice' | 'meeting' | 'custom'
    dueInfo?: string
    actionUrl?: string
    userId: string
  }): Promise<EmailSendResult> {
    const template = reminderEmail(params)
    const result = await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await this.logEmail('reminder', params.email, result, params.userId)
    return result
  }

  /**
   * Send a generic notification email.
   */
  async sendNotification(params: {
    userName: string
    email: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    actionUrl?: string
    actionLabel?: string
    userId: string
  }): Promise<EmailSendResult> {
    const template = notificationEmail(params)
    const result = await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await this.logEmail('notification', params.email, result, params.userId)
    return result
  }

  /**
   * Send a password reset email.
   */
  async sendPasswordReset(params: {
    userName: string
    email: string
    resetUrl: string
    expiryMinutes: number
  }): Promise<EmailSendResult> {
    const template = passwordResetEmail(params)
    const result = await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await this.logEmail('password_reset', params.email, result)
    return result
  }

  /**
   * Send a team invitation email.
   */
  async sendTeamInvite(params: {
    inviteeName: string
    email: string
    teamName: string
    inviterName: string
    acceptUrl: string
    role: string
    userId: string
  }): Promise<EmailSendResult> {
    const template = teamInviteEmail(params)
    const result = await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await this.logEmail('team_invite', params.email, result, params.userId)
    return result
  }

  /**
   * Send a weekly summary email.
   */
  async sendWeeklySummary(params: {
    userName: string
    email: string
    weekRange: string
    stats: {
      tasksCompleted: number
      tasksCreated: number
      hoursTracked: number
      revenue: number
      currency: string
      invoicesSent: number
    }
    topProjects: Array<{ name: string; hours: number }>
    upcomingDeadlines: Array<{ title: string; date: string }>
    userId: string
  }): Promise<EmailSendResult> {
    const template = weeklySummaryEmail(params)
    const result = await sendEmail({
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await this.logEmail('weekly_summary', params.email, result, params.userId)
    return result
  }

  /**
   * Send a raw email with custom HTML content.
   */
  async sendRaw(params: {
    to: string
    subject: string
    html: string
    text?: string
    userId?: string
  }): Promise<EmailSendResult> {
    const result = await sendEmail({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })

    await this.logEmail('custom', params.to, result, params.userId)
    return result
  }

  // ─── Internal: Logging ─────────────────────────────────────────────────────────

  private async logEmail(
    type: string,
    recipient: string,
    result: EmailSendResult,
    userId?: string,
  ): Promise<void> {
    try {
      if (!userId) return

      await db.automationLog.create({
        data: {
          type: 'email_notification',
          action: result.success ? 'email_sent' : 'email_failed',
          details: JSON.stringify({
            templateType: type,
            recipient,
            messageId: result.messageId,
            error: result.error,
          }),
          success: result.success,
          userId,
        },
      })
    } catch (logError) {
      console.error('[EmailService] Failed to log email:', logError)
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────────

export const emailService = new EmailService()

// Re-export types and SMTP utilities
export { sendEmail, loadSmtpConfig, saveSmtpConfig, testSmtpConnection, isSmtpEnabled, disableSmtp, enableSmtp, getSmtpConfigStatus, type SmtpConfig, type EmailSendResult } from './smtp'
export { welcomeEmail, invoiceEmail, reminderEmail, notificationEmail, passwordResetEmail, teamInviteEmail, weeklySummaryEmail } from './templates'
