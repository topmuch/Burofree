/**
 * GET /api/inbox/channels — List connected channel accounts
 * POST /api/inbox/channels — Connect new channel account (save encrypted tokens)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { connectChannelAccountSchema } from '@/lib/validations/inbox'
import { getChannelAccounts, connectChannelAccount } from '@/features/unified-inbox/services/inbox-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const accounts = await getChannelAccounts(auth.user.id)
    return NextResponse.json({ data: accounts })
  } catch (error) {
    console.error('[inbox/channels GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = connectChannelAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const account = await connectChannelAccount(auth.user.id, parsed.data)
    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('[inbox/channels POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
