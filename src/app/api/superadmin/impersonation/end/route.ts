/**
 * POST /api/superadmin/impersonation/end
 * End an impersonation session. Called by the ImpersonationBanner.
 */

import { NextRequest, NextResponse } from 'next/server'
import { endImpersonation } from '@/features/superadmin/utils/impersonation'
import { db } from '@/lib/db'
import { z } from 'zod'

const endSchema = z.object({
  sessionId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
    }

    const parsed = endSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
    }

    const { sessionId } = parsed.data

    // Find the session
    const session = await db.impersonationSession.findUnique({
      where: { token: sessionId },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 })
    }

    if (session.endedAt) {
      return NextResponse.json({ error: 'Session déjà terminée.' }, { status: 400 })
    }

    const success = await endImpersonation(sessionId)
    if (!success) {
      return NextResponse.json({ error: 'Impossible de terminer la session.' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Session terminée.' })
  } catch (error) {
    console.error('[Impersonation End] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
