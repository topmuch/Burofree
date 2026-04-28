import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireTeamAccess } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { pipelineCreateSchema } from '@/lib/validations/crm'
import { getPipelines, createPipeline } from '@/features/crm/services/deal-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const teamId = req.nextUrl.searchParams.get('teamId') || undefined
    // If teamId is provided in query, verify team membership
    if (teamId) {
      const membership = await requireTeamAccess(auth.user.id, teamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }
    const pipelines = await getPipelines(auth.user.id, teamId)
    return NextResponse.json(pipelines)
  } catch (err: any) {
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
    const data = pipelineCreateSchema.parse(body)
    // If teamId is provided in body, verify team membership
    const teamId = (data as any).teamId as string | undefined
    if (teamId) {
      const membership = await requireTeamAccess(auth.user.id, teamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }
    const pipeline = await createPipeline(auth.user.id, data)
    return NextResponse.json(pipeline, { status: 201 })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Données invalides', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
