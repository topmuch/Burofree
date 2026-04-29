/**
 * GET /api/audit-logs
 *
 * Query audit logs with filters.
 * - Admins can see all users' logs
 * - Regular users see only their own logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { queryAuditLogs } from '@/features/security/audit/enhanced-logger'
import { db } from '@/lib/db'
import { z } from 'zod'

// ─── Validation ──────────────────────────────────────────────────────────

const auditLogsQuerySchema = z.object({
  userId: z.string().optional(),
  teamId: z.string().optional(),
  action: z.string().optional(),
  target: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

// ─── Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth
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

  // Parse & validate query params
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = auditLogsQuerySchema.safeParse(sp)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const params = parsed.data

  // Access control: non-admin users can only see their own logs
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } })
  const isAdmin = dbUser?.role === 'admin' || dbUser?.role === 'superadmin'

  if (!isAdmin) {
    // Regular users are restricted to their own logs
    params.userId = user.id
  }

  const result = await queryAuditLogs({
    userId: params.userId,
    teamId: params.teamId,
    action: params.action,
    target: params.target,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    page: params.page,
    limit: params.limit,
  })

  return NextResponse.json(result, {
    headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining),
  })
}
