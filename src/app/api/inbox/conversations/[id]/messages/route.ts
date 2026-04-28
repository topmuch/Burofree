/**
 * GET /api/inbox/conversations/[id]/messages — List messages in conversation (cursor pagination)
 * POST /api/inbox/conversations/[id]/messages — Send new message in conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { listMessagesQuerySchema, sendMessageSchema } from '@/lib/validations/inbox'
import { db } from '@/lib/db'
import { sendMessage } from '@/features/unified-inbox/services/inbox-service'

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
    const { id: conversationId } = await params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const parsed = listMessagesQuerySchema.safeParse(searchParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { cursor, limit, direction } = parsed.data

    // Verify conversation ownership
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, userId: auth.user.id },
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    const where: Record<string, unknown> = { conversationId }
    if (direction) where.direction = direction
    if (cursor) where.id = { lt: cursor }

    const messages = await db.inboxMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = messages.length > limit
    const data = hasMore ? messages.slice(0, limit) : messages
    const nextCursor = hasMore ? data[data.length - 1].id : null

    return NextResponse.json({ data, nextCursor, hasMore })
  } catch (error) {
    console.error('[inbox/conversations/[id]/messages GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

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
    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await sendMessage(auth.user.id, conversationId, parsed.data)
    if (!result) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[inbox/conversations/[id]/messages POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
