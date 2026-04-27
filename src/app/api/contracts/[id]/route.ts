import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contract = await db.contract.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Contract GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.type !== undefined) updateData.type = body.type
    if (body.status !== undefined) updateData.status = body.status
    if (body.clientName !== undefined) updateData.clientName = body.clientName
    if (body.clientEmail !== undefined) updateData.clientEmail = body.clientEmail
    if (body.clientAddress !== undefined) updateData.clientAddress = body.clientAddress
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.value !== undefined) updateData.value = body.value
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.terms !== undefined) updateData.terms = body.terms
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null

    const contract = await db.contract.update({
      where: { id },
      data: updateData,
      include: { project: true },
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Contract PUT error:', error)
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.contract.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contract DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 })
  }
}
