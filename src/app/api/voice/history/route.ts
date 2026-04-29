/**
 * GET /api/voice/history — Get voice command history
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { voiceHistoryQuerySchema } from '@/lib/validations/differentiation'

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url)
    const query = voiceHistoryQuerySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    })

    const [logs, total] = await Promise.all([
      db.voiceLog.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.voiceLog.count({ where: { userId: auth.user.id } }),
    ])

    return NextResponse.json({
      logs,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: query.page * query.limit < total,
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    console.error('Voice history error:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération de l\'historique' }, { status: 500 })
  }
}
