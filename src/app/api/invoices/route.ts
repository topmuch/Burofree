import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { userId: auth.user.id }
    if (type) where.type = type
    if (status) where.status = status

    const invoices = await db.invoice.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  try {
    const body = await req.json()

    if (!body.number || !body.clientName) {
      return NextResponse.json({ error: 'Number and clientName are required' }, { status: 400 })
    }

    // Accept items as either a JSON string or an array
    let itemsStr = body.items
    if (Array.isArray(body.items)) {
      itemsStr = JSON.stringify(body.items)
    }

    // Calculate totals if items is provided as array, otherwise use provided values
    let subtotal = body.subtotal
    let taxRate = body.taxRate || 20.0
    let taxAmount = body.taxAmount
    let total = body.total

    if (Array.isArray(body.items) && !body.subtotal) {
      subtotal = body.items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0)
      taxAmount = subtotal * (taxRate / 100)
      total = subtotal + taxAmount
    } else if (body.subtotal !== undefined && body.taxAmount === undefined) {
      taxAmount = subtotal * (taxRate / 100)
      total = subtotal + taxAmount
    }

    const invoice = await db.invoice.create({
      data: {
        number: body.number,
        type: body.type || 'invoice',
        clientName: body.clientName,
        clientEmail: body.clientEmail,
        clientAddress: body.clientAddress,
        items: itemsStr || '[]',
        subtotal: subtotal || 0,
        taxRate,
        taxAmount: taxAmount || 0,
        total: total || 0,
        currency: body.currency || 'EUR',
        status: body.status || 'draft',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes,
        projectId: body.projectId || null,
        paymentMethod: body.paymentMethod || 'manual',
        userId: auth.user.id,
      },
      include: { project: true },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Invoices POST error:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
