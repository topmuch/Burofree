/**
 * DELETE /api/inbox/channels/[id] — Disconnect channel account (deactivate)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { disconnectChannelAccount } from '@/features/unified-inbox/services/inbox-service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const { id } = await params
    const result = await disconnectChannelAccount(auth.user.id, id)
    if (!result) {
      return NextResponse.json({ error: 'Compte canal non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[inbox/channels/[id] DELETE]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
