/**
 * POST /api/inbox/conversations/[id]/assign — Assign conversation to a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { assignConversationSchema } from '@/lib/validations/inbox'
import { assignConversation } from '@/features/unified-inbox/services/inbox-service'

export async function POST(
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
    const { id: conversationId } = await params
    const body = await req.json()
    const parsed = assignConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await assignConversation(auth.user.id, conversationId, parsed.data.assignedToId)
    if (!result) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[inbox/conversations/[id]/assign POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
