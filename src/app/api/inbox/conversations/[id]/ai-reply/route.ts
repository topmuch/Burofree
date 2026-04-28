/**
 * POST /api/inbox/conversations/[id]/ai-reply — Generate AI reply
 * Body: { tone?: 'pro' | 'friendly' | 'formal' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { generateAiReplySchema } from '@/lib/validations/inbox'
import { generateAIReply } from '@/features/unified-inbox/services/inbox-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 AI replies per minute
  })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const { id: conversationId } = await params
    const body = await req.json()
    const parsed = generateAiReplySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await generateAIReply(auth.user.id, conversationId, parsed.data.tone)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[inbox/conversations/[id]/ai-reply POST]', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
