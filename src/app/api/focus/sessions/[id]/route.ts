/**
 * PUT /api/focus/sessions/[id] — Update a focus session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { focusSessionUpdateSchema } from '@/lib/validations/differentiation'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params
    const body = await req.json()
    const data = focusSessionUpdateSchema.parse(body)

    // Verify ownership
    const existing = await db.focusSession.findUnique({ where: { id } })
    if (!existing || existing.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (data.endedAt !== undefined) updateData.endedAt = new Date(data.endedAt)
    if (data.pausedAt !== undefined) updateData.pausedAt = new Date(data.pausedAt)
    if (data.totalPausedSec !== undefined) updateData.totalPausedSec = data.totalPausedSec
    if (data.completed !== undefined) updateData.completed = data.completed

    const session = await db.focusSession.update({
      where: { id },
      data: updateData,
    })

    // If session is completed, create a TimeEntry linked to the task/project
    if (data.completed === true && existing.endedAt) {
      const durationSec = Math.round(
        (new Date(existing.endedAt).getTime() - new Date(existing.startedAt).getTime()) / 1000
      ) - (data.totalPausedSec ?? existing.totalPausedSec)
      const durationMin = Math.max(1, Math.round(durationSec / 60))

      await db.timeEntry.create({
        data: {
          userId: auth.user.id,
          startTime: existing.startedAt,
          endTime: new Date(existing.endedAt),
          duration: durationMin,
          description: `Session focus — ${existing.type} (${existing.durationMinutes} min)`,
          isBillable: true,
          taskId: existing.taskId,
          projectId: existing.projectId,
        },
      })
    }

    return NextResponse.json(session)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Données invalides', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    console.error('Focus session update error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la session' }, { status: 500 })
  }
}
