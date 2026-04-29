import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { voiceLogSchema } from '@/lib/validations/differentiation'

/**
 * POST /api/voice-logs — Log a voice command
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    // Validate input
    const body = await req.json()
    const parsed = voiceLogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { transcript, intent, confidence, executed, error } = parsed.data

    const voiceLog = await db.voiceLog.create({
      data: {
        userId: user.id,
        transcript,
        intent,
        confidence,
        executed,
        error,
      },
    })

    return NextResponse.json({ voiceLog }, { status: 201 })
  } catch (error) {
    console.error('Voice logs POST error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la commande vocale' },
      { status: 500 }
    )
  }
}
