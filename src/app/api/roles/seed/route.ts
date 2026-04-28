/**
 * POST /api/roles/seed — Seed default roles and permissions (superadmin only, idempotent)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { seedRolesAndPermissions } from '@/features/security/rbac/seed'
import { invalidateAllPermissionCaches } from '@/features/security/rbac/checker'

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth(req)
  if (!user) return response!

  // Superadmin only
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Accès refusé. Droits superadmin requis.' },
      { status: 403 },
    )
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

  try {
    const result = await seedRolesAndPermissions()
    // Seeding creates/updates default roles and permissions — invalidate all caches
    invalidateAllPermissionCaches()
    return NextResponse.json(
      { message: 'Rôles et permissions initialisés avec succès', ...result },
      { headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining) },
    )
  } catch (error) {
    console.error('[roles/seed] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation des rôles' },
      { status: 500 },
    )
  }
}
