import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateInvoicePDF, type InvoicePDFData } from '@/lib/pdf-generator'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { project: true },
    })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const user = await db.user.findFirst()
    const items = JSON.parse(invoice.items || '[]') as Array<{
      description?: string
      quantity?: number
      unitPrice?: number
    }>

    // Determine format from query param (?format=html or ?format=pdf)
    const format = req.nextUrl.searchParams.get('format') || 'pdf'

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

    const result = await generateInvoicePDF(invoiceData, {
      format: format as 'pdf' | 'html',
    })

    const filename = `${invoice.number}${result.isPDF ? '.pdf' : '.html'}`

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        ...(result.isPDF ? { 'Content-Length': String((result.content as Buffer).length) } : {}),
      },
    })
  } catch (error) {
    console.error('PDF error:', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
