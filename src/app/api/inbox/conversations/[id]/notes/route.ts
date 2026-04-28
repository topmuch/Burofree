/**
 * GET /api/inbox/conversations/[id]/notes — List internal notes
 * POST /api/inbox/conversations/[id]/notes — Add internal note
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { listNotesQuerySchema, addInternalNoteSchema } from '@/lib/validations/inbox'
import { db } from '@/lib/db'
import { addInternalNote } from '@/features/unified-inbox/services/inbox-service'

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
    const parsed = listNotesQuerySchema.safeParse(searchParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { cursor, limit } = parsed.data

    // Verify conversation ownership
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, userId: auth.user.id },
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    const where: Record<string, unknown> = { conversationId }
    if (cursor) where.id = { lt: cursor }

    const notes = await db.internalNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = notes.length > limit
    const data = hasMore ? notes.slice(0, limit) : notes
    const nextCursor = hasMore ? data[data.length - 1].id : null

    return NextResponse.json({ data, nextCursor, hasMore })
  } catch (error) {
    console.error('[inbox/conversations/[id]/notes GET]', error)
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
    const parsed = addInternalNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await addInternalNote(auth.user.id, conversationId, parsed.data.content)
    if (!result) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[inbox/conversations/[id]/notes POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
