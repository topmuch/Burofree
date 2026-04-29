/**
 * POST /api/roles/check — Check if current user has a permission
 *
 * Body: { permission: string, teamId?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { hasPermission } from '@/features/security/rbac/checker'
import { z } from 'zod'

// ─── Validation ──────────────────────────────────────────────────────────

const checkPermissionSchema = z.object({
  permission: z.string().min(1, 'La permission est requise'),
  teamId: z.string().optional(),
})

// ─── Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

  // Rate limit
  const rlId = getRateLimitIdentifier(req, user.id)
  const rl = checkRateLimit(rlId, DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining, rl.retryAfterMs) },
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = checkPermissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { permission, teamId } = parsed.data

  const allowed = await hasPermission(user.id, permission, teamId)

  return NextResponse.json(
    { permission, teamId: teamId || null, allowed },
    { headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining) },
  )
}
