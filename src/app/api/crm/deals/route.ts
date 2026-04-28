import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireTeamAccess } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { dealCreateSchema, dealQuerySchema } from '@/lib/validations/crm'
import { getDeals, createDeal } from '@/features/crm/services/deal-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const filters = dealQuerySchema.parse(params)
    // If teamId is provided in query, verify team membership
    const teamId = (filters as any).teamId as string | undefined
    if (teamId) {
      const membership = await requireTeamAccess(auth.user.id, teamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }
    const result = await getDeals(auth.user.id, filters)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Paramètres invalides', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const data = dealCreateSchema.parse(body)
    // If teamId is provided in body, verify team membership
    const teamId = (data as any).teamId as string | undefined
    if (teamId) {
      const membership = await requireTeamAccess(auth.user.id, teamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }
    const deal = await createDeal(auth.user.id, data)
    return NextResponse.json(deal, { status: 201 })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Données invalides', details: err.issues }, { status: 400 })
    if (err.message?.includes('non trouvé')) return NextResponse.json({ error: err.message }, { status: 404 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
