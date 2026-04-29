import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendGmailEmail } from '@/lib/google'
import { sendOutlookEmail } from '@/lib/microsoft'
import { createAIEngine, type ChatMessage } from '@/lib/ai'

// GET: Find all overdue invoices and send reminder emails
export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Find overdue invoices: status=sent, dueDate < now
    const overdueInvoices = await db.invoice.findMany({
      where: {
        userId: user.id,
        status: 'sent',
        dueDate: { lt: new Date() },
        clientEmail: { not: null },
      },
      include: { project: true },
    })

    if (overdueInvoices.length === 0) {
      return NextResponse.json({
        message: 'Aucune facture en retard trouv\u00e9e',
        sent: 0,
      })
    }

    // Find user's email account
    const emailAccount = await db.emailAccount.findFirst({
      where: { userId: user.id, isPrimary: true },
    })

    if (!emailAccount) {
      return NextResponse.json({
        message: 'Aucun compte email connect\u00e9',
        overdue: overdueInvoices.length,
        sent: 0,
      })
    }

    let sentCount = 0
    const errors: string[] = []

    for (const invoice of overdueInvoices) {
      try {
        if (!invoice.clientEmail) continue

        // Generate personalized reminder text using AI
        let reminderBody: string
        try {
          const engine = createAIEngine()
          const daysOverdue = Math.floor(
            (Date.now() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
          )

          const messages: ChatMessage[] = [
            {
              role: 'system',
              content: `Tu es ${user.assistantName}, l'assistant de ${user.name}. Tu r\u00e9diges un email de relance professionnel mais courtois en fran\u00e7ais. Reste concis.`,
            },
            {
              role: 'user',
              content: `R\u00e9dige un email de relance pour la facture ${invoice.number} de ${invoice.total.toFixed(2)} ${invoice.currency} adress\u00e9e \u00e0 ${invoice.clientName}. Elle est en retard de ${daysOverdue} jours. Date d'\u00e9ch\u00e9ance : ${new Date(invoice.dueDate!).toLocaleDateString('fr-FR')}. Sois professionnel mais amical.`,
            },
          ]

          reminderBody = await engine.chat(messages, { temperature: 0.5, maxTokens: 300 })
        } catch {
          // Fallback reminder text
          const daysOverdue = Math.floor(
            (Date.now() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
          )
          reminderBody = `Bonjour ${invoice.clientName},

Je me permets de vous relancer concernant la facture ${invoice.number} d'un montant de ${invoice.total.toFixed(2)} ${invoice.currency} dont l'\u00e9ch\u00e9ance \u00e9tait le ${new Date(invoice.dueDate!).toLocaleDateString('fr-FR')}.

Cette facture est en retard de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}.

Merci de bien vouloir proc\u00e9der au r\u00e8glement dans les meilleurs d\u00e9lais. N'h\u00e9sitez pas \u00e0 me contacter si vous avez des questions.

Cordialement,
${user.name || 'Freelance'}`
        }

        const subject = `Relance - Facture ${invoice.number} - ${user.name || 'Freelance'}`

        // Send reminder email
        if (emailAccount.provider === 'google' || emailAccount.provider === 'gmail') {
          await sendGmailEmail(emailAccount.id, invoice.clientEmail, subject, reminderBody)
        } else if (emailAccount.provider === 'outlook' || emailAccount.provider === 'microsoft') {
          await sendOutlookEmail(emailAccount.id, invoice.clientEmail, subject, reminderBody)
        }

        // Update invoice status to overdue
        await db.invoice.update({
          where: { id: invoice.id },
          data: { status: 'overdue' },
        })

        // Create notification
        await db.notification.create({
          data: {
            title: 'Relance envoy\u00e9e',
            message: `Relance envoy\u00e9e pour la facture ${invoice.number} \u00e0 ${invoice.clientName}`,
            type: 'warning',
            channel: 'in_app',
            userId: user.id,
          },
        })

        sentCount++
      } catch (err) {
        errors.push(`${invoice.number}: ${err instanceof Error ? err.message : 'Erreur'}`)
      }
    }

    return NextResponse.json({
      message: `${sentCount} relance${sentCount > 1 ? 's' : ''} envoy\u00e9e${sentCount > 1 ? 's' : ''}`,
      overdue: overdueInvoices.length,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: '\u00c9chec de l\'envoi des relances' }, { status: 500 })
  }
}

// POST: Send a reminder for a specific invoice
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 })
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { project: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    if (!invoice.clientEmail) {
      return NextResponse.json({ error: 'Le client n\'a pas d\'adresse email' }, { status: 400 })
    }

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Find user's email account
    const emailAccount = await db.emailAccount.findFirst({
      where: { userId: user.id, isPrimary: true },
    })

    if (!emailAccount) {
      return NextResponse.json({ error: 'Aucun compte email connect\u00e9' }, { status: 400 })
    }

    // Generate personalized reminder text using AI
    let reminderBody: string
    const daysOverdue = invoice.dueDate
      ? Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    try {
      const engine = createAIEngine()
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Tu es ${user.assistantName}, l'assistant de ${user.name}. Tu r\u00e9diges un email de relance professionnel mais courtois en fran\u00e7ais. Reste concis.`,
        },
        {
          role: 'user',
          content: `R\u00e9dige un email de relance pour la facture ${invoice.number} de ${invoice.total.toFixed(2)} ${invoice.currency} adress\u00e9e \u00e0 ${invoice.clientName}. ${daysOverdue > 0 ? `Elle est en retard de ${daysOverdue} jours.` : 'L\'\u00e9ch\u00e9ance approche.'} Date d'\u00e9ch\u00e9ance : ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : 'Non d\u00e9finie'}. Sois professionnel mais amical.`,
        },
      ]

      reminderBody = await engine.chat(messages, { temperature: 0.5, maxTokens: 300 })
    } catch {
      reminderBody = `Bonjour ${invoice.clientName},

Je me permets de vous relancer concernant la facture ${invoice.number} d'un montant de ${invoice.total.toFixed(2)} ${invoice.currency}${invoice.dueDate ? ` dont l'\u00e9ch\u00e9ance \u00e9tait le ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}` : ''}.

${daysOverdue > 0 ? `Cette facture est en retard de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}.` : 'Merci de bien vouloir proc\u00e9der au r\u00e8glement avant l\'\u00e9ch\u00e9ance.'}

N'h\u00e9sitez pas \u00e0 me contacter si vous avez des questions.

Cordialement,
${user.name || 'Freelance'}`
    }

    const subject = `Relance - Facture ${invoice.number} - ${user.name || 'Freelance'}`

    // Send reminder email
    if (emailAccount.provider === 'google' || emailAccount.provider === 'gmail') {
      await sendGmailEmail(emailAccount.id, invoice.clientEmail, subject, reminderBody)
    } else if (emailAccount.provider === 'outlook' || emailAccount.provider === 'microsoft') {
      await sendOutlookEmail(emailAccount.id, invoice.clientEmail, subject, reminderBody)
    }

    // Update invoice status to overdue if past due date
    if (invoice.status === 'sent' && invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: 'overdue' },
      })
    }

    // Create notification
    await db.notification.create({
      data: {
        title: 'Relance envoy\u00e9e',
        message: `Relance envoy\u00e9e pour la facture ${invoice.number} \u00e0 ${invoice.clientName}`,
        type: 'warning',
        channel: 'in_app',
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Relance envoy\u00e9e \u00e0 ${invoice.clientEmail}`,
    })
  } catch (error) {
    console.error('Reminder POST error:', error)
    return NextResponse.json({ error: '\u00c9chec de l\'envoi de la relance' }, { status: 500 })
  }
}
