/**
 * Team Invitation API
 *
 * POST: Invite a member to a team
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { createTeamInvitation } from '@/features/production/teams/invitation-manager'
import { z } from 'zod'
import type { TeamRole } from '@/features/production/teams/permissions'

const inviteSchema = z.object({
  teamId: z.string().min(1, 'L\'ID de l\'équipe est requis'),
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimitId = getRateLimitIdentifier(req, auth.user.id)
  const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  }

  const { teamId, email, role } = parsed.data

  const result = await createTeamInvitation(auth.user.id, teamId, email, role as TeamRole)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, inviteId: result.inviteId }, { status: 201 })
}
