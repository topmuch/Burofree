/**
 * POST /api/focus/sessions — Start a focus session
 * GET /api/focus/sessions — List focus sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { focusSessionCreateSchema, focusSessionQuerySchema } from '@/lib/validations/differentiation'

// POST — Start a focus session
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
    const data = focusSessionCreateSchema.parse(body)

    const session = await db.focusSession.create({
      data: {
        userId: auth.user.id,
        type: data.type,
        durationMinutes: data.durationMinutes,
        breakMinutes: data.breakMinutes,
        taskId: data.taskId || null,
        projectId: data.projectId || null,
        ambientSound: data.ambientSound ?? null,
        startedAt: new Date(),
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Données invalides', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    console.error('Focus session create error:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 })
  }
}

// GET — List focus sessions
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
    const query = focusSessionQuerySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      completed: searchParams.get('completed') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    })

    const where: Record<string, unknown> = {
      userId: auth.user.id,
    }

    if (query.completed === 'true') where.completed = true
    if (query.completed === 'false') where.completed = false
    if (query.from || query.to) {
      const startedAtFilter: Record<string, Date> = {}
      if (query.from) startedAtFilter.gte = new Date(query.from)
      if (query.to) startedAtFilter.lte = new Date(query.to)
      where.startedAt = startedAtFilter
    }

    const [sessions, total] = await Promise.all([
      db.focusSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true, color: true } },
        },
      }),
      db.focusSession.count({ where }),
    ])

    return NextResponse.json({
      sessions,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: query.page * query.limit < total,
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    console.error('Focus sessions list error:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des sessions' }, { status: 500 })
  }
}
