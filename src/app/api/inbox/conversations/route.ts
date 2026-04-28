/**
 * GET /api/inbox/conversations — List conversations with cursor pagination + filters
 * POST /api/inbox/conversations — Create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { listConversationsQuerySchema, createConversationSchema } from '@/lib/validations/inbox'
import { getConversations, createConversation } from '@/features/unified-inbox/services/inbox-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const parsed = listConversationsQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { cursor, limit, status, channel, assignedTo, search, tags } = parsed.data
    const result = await getConversations(auth.user.id, {
      cursor,
      limit,
      status,
      channel,
      assignedTo,
      search,
      tags: tags ? JSON.parse(tags) : undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[inbox/conversations GET]', error)
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
    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await createConversation(auth.user.id, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[inbox/conversations POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
