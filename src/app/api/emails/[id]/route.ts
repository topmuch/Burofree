import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const email = await db.email.update({
      where: { id },
      data: {
        ...(body.isRead !== undefined && { isRead: body.isRead }),
        ...(body.isStarred !== undefined && { isStarred: body.isStarred }),
      },
    })

    return NextResponse.json(email)
  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'email' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.email.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression de l\'email' }, { status: 500 })
  }
}
