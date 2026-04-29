/**
 * Email Send API — Send a notification email
 *
 * POST - Send an email via SMTP using predefined templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, ...params } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Type d\'email requis (welcome, invoice, reminder, notification, password_reset, team_invite, weekly_summary)' },
        { status: 400 },
      )
    }

    // Get current user for context
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    let result

    switch (type) {
      case 'welcome':
        result = await emailService.sendWelcome({
          name: params.name || user.name || 'Freelance',
          email: params.email || user.email,
        })
        break

      case 'invoice':
        if (!params.clientEmail || !params.invoiceNumber) {
          return NextResponse.json({ error: 'clientEmail et invoiceNumber requis' }, { status: 400 })
        }
        result = await emailService.sendInvoice({
          clientName: params.clientName || 'Client',
          clientEmail: params.clientEmail,
          freelancerName: params.freelancerName || user.name || 'Freelance',
          invoiceNumber: params.invoiceNumber,
          amount: params.amount || '0,00 €',
          currency: params.currency || 'EUR',
          dueDate: params.dueDate,
          invoiceType: params.invoiceType || 'invoice',
          paymentUrl: params.paymentUrl,
          userId: user.id,
        })
        break

      case 'reminder':
        if (!params.email || !params.reminderTitle) {
          return NextResponse.json({ error: 'email et reminderTitle requis' }, { status: 400 })
        }
        result = await emailService.sendReminder({
          userName: params.userName || user.name || 'Freelance',
          email: params.email,
          reminderTitle: params.reminderTitle,
          reminderMessage: params.reminderMessage || '',
          reminderType: params.reminderType || 'custom',
          dueInfo: params.dueInfo,
          actionUrl: params.actionUrl,
          userId: user.id,
        })
        break

      case 'notification':
        if (!params.email || !params.title) {
          return NextResponse.json({ error: 'email et title requis' }, { status: 400 })
        }
        result = await emailService.sendNotification({
          userName: params.userName || user.name || 'Freelance',
          email: params.email,
          title: params.title,
          message: params.message || '',
          type: params.notificationType || 'info',
          actionUrl: params.actionUrl,
          actionLabel: params.actionLabel,
          userId: user.id,
        })
        break

      case 'password_reset':
        if (!params.email || !params.resetUrl) {
          return NextResponse.json({ error: 'email et resetUrl requis' }, { status: 400 })
        }
        result = await emailService.sendPasswordReset({
          userName: params.userName || user.name || 'Freelance',
          email: params.email,
          resetUrl: params.resetUrl,
          expiryMinutes: params.expiryMinutes || 30,
        })
        break

      case 'team_invite':
        if (!params.email || !params.teamName || !params.inviterName) {
          return NextResponse.json({ error: 'email, teamName et inviterName requis' }, { status: 400 })
        }
        result = await emailService.sendTeamInvite({
          inviteeName: params.inviteeName || 'Collègue',
          email: params.email,
          teamName: params.teamName,
          inviterName: params.inviterName,
          acceptUrl: params.acceptUrl,
          role: params.role || 'member',
          userId: user.id,
        })
        break

      case 'weekly_summary':
        if (!params.email) {
          return NextResponse.json({ error: 'email requis' }, { status: 400 })
        }
        result = await emailService.sendWeeklySummary({
          userName: params.userName || user.name || 'Freelance',
          email: params.email,
          weekRange: params.weekRange || 'cette semaine',
          stats: params.stats || {
            tasksCompleted: 0,
            tasksCreated: 0,
            hoursTracked: 0,
            revenue: 0,
            currency: 'EUR',
            invoicesSent: 0,
          },
          topProjects: params.topProjects || [],
          upcomingDeadlines: params.upcomingDeadlines || [],
          userId: user.id,
        })
        break

      default:
        return NextResponse.json(
          { error: `Type d'email non supporté: ${type}` },
          { status: 400 },
        )
    }

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Échec de l\'envoi de l\'email' }, { status: 500 })
  }
}
