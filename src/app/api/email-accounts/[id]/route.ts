/**
 * Email Account DELETE API Route
 *
 * DELETE /api/email-accounts/[id] — Remove a connected email account
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const account = await db.emailAccount.findFirst({
      where: { id, userId: user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Compte non trouvé' }, { status: 404 })
    }

    // Delete all associated emails first
    await db.email.deleteMany({
      where: { emailAccountId: id },
    })

    // Delete the account
    await db.emailAccount.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email account DELETE error:', error)
    return NextResponse.json(
      { error: 'Échec de la suppression du compte' },
      { status: 500 }
    )
  }
}
