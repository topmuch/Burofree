import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { dealUpdateSchema } from '@/lib/validations/crm'
import { getDeal, updateDeal, deleteDeal, updateDealStage } from '@/features/crm/services/deal-service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const deal = await getDeal(id, auth.user.id)
    if (!deal) return NextResponse.json({ error: 'Affaire non trouvée' }, { status: 404 })
    return NextResponse.json(deal)
  } catch (err: any) {
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

    // Handle stage change (drag & drop in kanban)
    if (body.stageId && Object.keys(body).length <= 2) {
      const deal = await updateDealStage(id, auth.user.id, body.stageId)
      return NextResponse.json(deal)
    }

    const data = dealUpdateSchema.parse(body)
    const deal = await updateDeal(id, auth.user.id, data)
    return NextResponse.json(deal)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Données invalides', details: err.issues }, { status: 400 })
    if (err.message?.includes('non trouvée')) return NextResponse.json({ error: err.message }, { status: 404 })
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
    const result = await deleteDeal(id, auth.user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message?.includes('non trouvée')) return NextResponse.json({ error: err.message }, { status: 404 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
