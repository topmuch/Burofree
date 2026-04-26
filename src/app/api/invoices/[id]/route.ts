import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.number !== undefined) updateData.number = body.number
    if (body.type !== undefined) updateData.type = body.type
    if (body.clientName !== undefined) updateData.clientName = body.clientName
    if (body.clientEmail !== undefined) updateData.clientEmail = body.clientEmail
    if (body.clientAddress !== undefined) updateData.clientAddress = body.clientAddress
    if (body.items !== undefined) {
      const itemsArray = typeof body.items === 'string' ? JSON.parse(body.items) : body.items
      updateData.items = JSON.stringify(itemsArray)
      const subtotal = itemsArray.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0)
      updateData.subtotal = subtotal
      const invoice = await db.invoice.findUnique({ where: { id } })
      if (invoice) {
        const taxRate = body.taxRate ?? invoice.taxRate
        updateData.taxRate = taxRate
        updateData.taxAmount = subtotal * (taxRate / 100)
        updateData.total = subtotal + subtotal * (taxRate / 100)
      }
    }
    if (body.subtotal !== undefined && !body.items) updateData.subtotal = body.subtotal
    if (body.taxRate !== undefined && !body.items) updateData.taxRate = body.taxRate
    if (body.taxAmount !== undefined) updateData.taxAmount = body.taxAmount
    if (body.total !== undefined) updateData.total = body.total
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'paid') updateData.paidAt = new Date()
    }
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: { project: true },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice PUT error:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invoice DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
