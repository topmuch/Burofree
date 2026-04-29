import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { pipelineUpdateSchema, pipelineStageSchema } from '@/lib/validations/crm'
import { getPipeline, updatePipeline, deletePipeline, updatePipelineStages, getPipelineStats } from '@/features/crm/services/deal-service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const includeStats = req.nextUrl.searchParams.get('stats') === 'true'

    if (includeStats) {
      const stats = await getPipelineStats(id, auth.user.id)
      return NextResponse.json(stats)
    }

    const pipeline = await getPipeline(id, auth.user.id)
    if (!pipeline) return NextResponse.json({ error: 'Pipeline non trouvé' }, { status: 404 })
    return NextResponse.json(pipeline)
  } catch (err: any) {
    if (err.message?.includes('non trouvé')) return NextResponse.json({ error: err.message }, { status: 404 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    // Handle stages array update separately
    if (body.stages && Array.isArray(body.stages)) {
      const stages = body.stages.map((s: any) => pipelineStageSchema.parse(s))
      const pipeline = await updatePipelineStages(id, auth.user.id, stages)
      return NextResponse.json(pipeline)
    }

    const data = pipelineUpdateSchema.parse(body)
    const pipeline = await updatePipeline(id, auth.user.id, data)
    return NextResponse.json(pipeline)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Données invalides', details: err.issues }, { status: 400 })
    if (err.message?.includes('non trouvé')) return NextResponse.json({ error: err.message }, { status: 404 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const result = await deletePipeline(id, auth.user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message?.includes('non trouvé')) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err.message?.includes('Impossible')) return NextResponse.json({ error: err.message }, { status: 409 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
