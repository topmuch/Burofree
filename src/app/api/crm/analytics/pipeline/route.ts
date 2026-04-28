import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { analyticsPipelineQuerySchema } from '@/lib/validations/crm'
import { getPipelineStats, getRevenueForecast } from '@/features/crm/services/analytics-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } })
  }

  const parsed = analyticsPipelineQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const [stats, forecast] = await Promise.all([
    getPipelineStats(auth.user.id, parsed.data.period),
    getRevenueForecast(parsed.data.pipelineId),
  ])

  return NextResponse.json({ stats, forecast })
}
