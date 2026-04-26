import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const reminder = await db.reminder.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.message !== undefined && { message: body.message }),
        ...(body.remindAt !== undefined && { remindAt: new Date(body.remindAt) }),
        ...(body.isSent !== undefined && { isSent: body.isSent }),
        ...(body.type !== undefined && { type: body.type }),
      },
    })

    return NextResponse.json(reminder)
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du rappel' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.reminder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du rappel' }, { status: 500 })
  }
}
