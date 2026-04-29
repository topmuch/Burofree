/**
 * GET  /api/security/alerts  — List security alerts (admin only)
 * POST /api/security/alerts  — Acknowledge / resolve / false_positive an alert
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { z } from 'zod'

// ─── Validation ──────────────────────────────────────────────────────────

const alertsQuerySchema = z.object({
  status: z.enum(['active', 'acknowledged', 'resolved', 'false_positive']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const alertActionSchema = z.object({
  alertId: z.string().min(1, "L'ID de l'alerte est requis"),
  action: z.enum(['acknowledge', 'resolve', 'false_positive']),
})

// ─── Helpers ─────────────────────────────────────────────────────────────

async function requireAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === 'admin' || user?.role === 'superadmin'
}

// ─── GET ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

  // Admin only
  const isAdmin = await requireAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Accès refusé. Droits administrateur requis.' }, { status: 403 })
  }

  // Rate limit
  const rlId = getRateLimitIdentifier(req, user.id)
  const rl = checkRateLimit(rlId, DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining, rl.retryAfterMs) },
    )
  }

  // Parse query
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = alertsQuerySchema.safeParse(sp)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { status, severity, type, page, limit } = parsed.data

  const where: Record<string, any> = {}
  if (status) where.status = status
  if (severity) where.severity = severity
  if (type) where.type = { contains: type }

  const [alerts, total] = await Promise.all([
    db.securityAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.securityAlert.count({ where }),
  ])

  return NextResponse.json(
    { alerts, total, page, limit, totalPages: Math.ceil(total / limit) },
    { headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining) },
  )
}

// ─── POST ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

  // Admin only
  const isAdmin = await requireAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Accès refusé. Droits administrateur requis.' }, { status: 403 })
  }

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

  const parsed = alertActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { alertId, action } = parsed.data

  // Verify alert exists
  const alert = await db.securityAlert.findUnique({ where: { id: alertId } })
  if (!alert) {
    return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
  }

  // Map action to status
  const statusMap: Record<string, string> = {
    acknowledge: 'acknowledged',
    resolve: 'resolved',
    false_positive: 'false_positive',
  }
  const newStatus = statusMap[action]
  if (!newStatus) {
    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  }

  const updated = await db.securityAlert.update({
    where: { id: alertId },
    data: {
      status: newStatus,
      resolvedBy: user.id,
      resolvedAt: new Date(),
    },
  })

  return NextResponse.json({ alert: updated }, {
    headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining),
  })
}
