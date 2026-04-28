import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { activityQuerySchema } from '@/lib/validations/crm'
import { getContactActivities } from '@/features/crm/services/contact-service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const query = Object.fromEntries(req.nextUrl.searchParams)
    const filters = activityQuerySchema.parse(query)
    const activities = await getContactActivities(id, auth.user.id, {
      type: filters.type,
      limit: filters.limit,
      cursor: filters.cursor,
    })
    return NextResponse.json(activities)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Paramètres invalides', details: err.issues }, { status: 400 })
    if (err.message?.includes('non trouvé')) return NextResponse.json({ error: err.message }, { status: 404 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
