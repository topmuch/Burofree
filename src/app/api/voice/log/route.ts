/**
 * POST /api/voice/log — Log a voice command
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { voiceLogSchema } from '@/lib/validations/differentiation'
import { parseVoiceIntent } from '@/features/differentiation/voice/voice-parser'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rlId = getRateLimitIdentifier(req, auth.user.id)
  const rl = checkRateLimit(rlId, DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer.' },
      { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining, rl.retryAfterMs) }
    )
  }

  try {
    const body = await req.json()
    const data = voiceLogSchema.parse(body)

    // Parse the intent server-side for logging
    const parsedIntent = parseVoiceIntent(data.transcript)

    const voiceLog = await db.voiceLog.create({
      data: {
        userId: auth.user.id,
        transcript: data.transcript,
        intent: data.intent || parsedIntent?.action || null,
        confidence: data.confidence || parsedIntent?.confidence || null,
        executed: data.executed,
        error: data.error || null,
      },
    })

    return NextResponse.json({
      ...voiceLog,
      parsedIntent: parsedIntent ? {
        action: parsedIntent.action,
        params: parsedIntent.params,
        confidence: parsedIntent.confidence,
      } : null,
    }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Données invalides', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    console.error('Voice log error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de la commande vocale' }, { status: 500 })
  }
}
