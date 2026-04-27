import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateInvoicePDF, type InvoicePDFData } from '@/lib/pdf-generator'
import { sendGmailEmail } from '@/lib/google'
import { sendOutlookEmail } from '@/lib/microsoft'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { project: true, user: true },
    })
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    if (!invoice.clientEmail) {
      return NextResponse.json({ error: 'Le client n\'a pas d\'adresse email' }, { status: 400 })
    }

    const user = invoice.user
    const items = JSON.parse(invoice.items || '[]') as Array<{
      description?: string
      quantity?: number
      unitPrice?: number
    }>

    // Generate PDF
    const invoiceData: InvoicePDFData = {
      invoice: {
        id: invoice.id,
        number: invoice.number,
        type: invoice.type,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientAddress: invoice.clientAddress,
        items: invoice.items,
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate?.toISOString() || null,
        paidAt: invoice.paidAt?.toISOString() || null,
        notes: invoice.notes,
        projectId: invoice.projectId,
        project: invoice.project ? {
          id: invoice.project.id,
          name: invoice.project.name,
          description: invoice.project.description,
          clientName: invoice.project.clientName,
          color: invoice.project.color,
          status: invoice.project.status,
          budget: invoice.project.budget,
          deadline: invoice.project.deadline?.toISOString() || null,
          userId: invoice.project.userId,
          _count: undefined,
          createdAt: invoice.project.createdAt.toISOString(),
          updatedAt: invoice.project.updatedAt.toISOString(),
        } : null,
        userId: invoice.userId,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
        projectName: invoice.project?.name || null,
        projectColor: invoice.project?.color || null,
      },
      emitter: {
        name: user?.name || 'Burofree',
        email: user?.email || '',
        profession: user?.profession || undefined,
      },
      items: items.map((item) => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
      })),
    }

    const pdfResult = await generateInvoicePDF(invoiceData)
    const isPDF = pdfResult.isPDF

    // Find user's email account
    const emailAccount = await db.emailAccount.findFirst({
      where: { userId: invoice.userId, isPrimary: true },
    })

    if (!emailAccount) {
      return NextResponse.json({ error: 'Aucun compte email connect\u00e9. Veuillez connecter un compte Gmail ou Outlook.' }, { status: 400 })
    }

    // Build email content
    const docLabel = invoice.type === 'quote' ? 'devis' : 'facture'
    const subject = `${docLabel.charAt(0).toUpperCase() + docLabel.slice(1)} ${invoice.number} - ${user?.name || 'Freelance'}`

    const bodyText = `Bonjour ${invoice.clientName},

Veuillez trouver ci-joint ${docLabel === 'devis' ? 'le devis' : 'la facture'} ${invoice.number} d'un montant de ${invoice.total.toLocaleString('fr-FR', { style: 'currency', currency: invoice.currency })}.

${invoice.dueDate ? `\u00c9ch\u00e9ance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}

${invoice.notes ? `Notes : ${invoice.notes}` : ''}

N'h\u00e9sitez pas \u00e0 me contacter pour toute question.

Cordialement,
${user?.name || 'Freelance'}`

    // Send email via the appropriate provider
    try {
      if (emailAccount.provider === 'google' || emailAccount.provider === 'gmail') {
        await sendGmailEmail(emailAccount.id, invoice.clientEmail, subject, bodyText)
      } else if (emailAccount.provider === 'outlook' || emailAccount.provider === 'microsoft') {
        await sendOutlookEmail(emailAccount.id, invoice.clientEmail, subject, bodyText)
      } else {
        return NextResponse.json({ error: 'Fournisseur email non support\u00e9' }, { status: 400 })
      }
    } catch (emailError) {
      console.error('Email send error:', emailError)
      return NextResponse.json({ error: '\u00c9chec de l\'envoi de l\'email. V\u00e9rifiez votre connexion email.' }, { status: 500 })
    }

    // Update invoice status to "sent" if it was draft
    if (invoice.status === 'draft') {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: 'sent' },
      })
    }

    // Create notification
    await db.notification.create({
      data: {
        title: `${docLabel.charAt(0).toUpperCase() + docLabel.slice(1)} envoy\u00e9`,
        message: `${docLabel.charAt(0).toUpperCase() + docLabel.slice(1)} ${invoice.number} envoy\u00e9 \u00e0 ${invoice.clientName} (${invoice.clientEmail})${isPDF ? ' avec PDF' : ' (format HTML)'}`,
        type: 'success',
        channel: 'in_app',
        userId: invoice.userId,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${docLabel.charAt(0).toUpperCase() + docLabel.slice(1)} envoy\u00e9 \u00e0 ${invoice.clientEmail}`,
      format: isPDF ? 'pdf' : 'html',
    })
  } catch (error) {
    console.error('Invoice send error:', error)
    return NextResponse.json({ error: '\u00c9chec de l\'envoi de la facture' }, { status: 500 })
  }
}
