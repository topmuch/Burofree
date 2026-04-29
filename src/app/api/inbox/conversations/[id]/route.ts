/**
 * GET /api/inbox/conversations/[id] — Get single conversation with messages, participants, notes
 * PUT /api/inbox/conversations/[id] — Update conversation (status, priority, assignedTo, tags)
 * DELETE /api/inbox/conversations/[id] — Close/archive conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { updateConversationSchema } from '@/lib/validations/inbox'
import { getConversation, updateConversation } from '@/features/unified-inbox/services/inbox-service'

export async function GET(
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
    const conversation = await getConversation(auth.user.id, id)

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('[inbox/conversations/[id] GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
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
    const body = await req.json()
    const parsed = updateConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await updateConversation(auth.user.id, id, parsed.data)
    if (!result) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[inbox/conversations/[id] PUT]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

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
    // Close/archive the conversation by setting status to 'closed'
    const result = await updateConversation(auth.user.id, id, { status: 'closed' })
    if (!result) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[inbox/conversations/[id] DELETE]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
