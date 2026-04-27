import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDefaultPreferences } from '@/lib/automation-cron'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { automationPrefSchema } from '@/lib/validations/productivity'

// ─── GET — Retrieve all automation preferences for the current user ──────────────
// If the user has no preferences yet, create defaults automatically.

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    // Ensure defaults exist, then fetch the full list
    await ensureDefaultPreferences(user.id)

    const preferences = await db.automationPreference.findMany({
      where: { userId: user.id },
      orderBy: { type: 'asc' },
    })

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Automation preferences GET error:', error)
    return NextResponse.json({ error: 'Échec du chargement des préférences d\'automatisation' }, { status: 500 })
  }
}

// ─── POST — Create or update an automation preference ───────────────────────────
// Body: { type: string, enabled?: boolean, channel?: string, frequency?: string, threshold?: number }
// Uses upsert on the unique [userId, type] constraint.

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    // Validate body with Zod
    const body = await req.json()
    const parse = automationPrefSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parse.error.flatten() },
        { status: 400 }
      )
    }
    const data = parse.data

    // Fetch existing preference to merge updates
    const existing = await db.automationPreference.findUnique({
      where: { userId_type: { userId: user.id, type: data.type } },
    })

    const upsertData = {
      enabled: data.enabled !== undefined ? data.enabled : existing?.enabled ?? true,
      channel: data.channel || existing?.channel || 'in_app',
      frequency: data.frequency || existing?.frequency || '15min',
      threshold: data.threshold !== undefined ? data.threshold : existing?.threshold ?? 7,
    }

    const preference = await db.automationPreference.upsert({
      where: { userId_type: { userId: user.id, type: data.type } },
      update: upsertData,
      create: {
        type: data.type,
        ...upsertData,
        userId: user.id,
      },
    })

    return NextResponse.json(preference)
  } catch (error) {
    console.error('Automation preferences POST error:', error)
    return NextResponse.json({ error: 'Échec de la mise à jour des préférences d\'automatisation' }, { status: 500 })
  }
}
