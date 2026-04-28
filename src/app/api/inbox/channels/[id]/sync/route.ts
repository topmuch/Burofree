/**
 * POST /api/inbox/channels/[id]/sync — Trigger manual sync for a channel account
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { syncChannelAccountSchema } from '@/lib/validations/inbox'
import { syncChannelAccount } from '@/features/unified-inbox/services/inbox-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), {
    maxRequests: 6,
    windowMs: 60 * 1000, // 6 syncs per minute per user
  })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = syncChannelAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await syncChannelAccount(auth.user.id, id)
    if (!result) {
      return NextResponse.json({ error: 'Compte canal non trouvé ou inactif' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[inbox/channels/[id]/sync POST]', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
