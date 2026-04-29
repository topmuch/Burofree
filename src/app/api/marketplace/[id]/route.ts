import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { moduleUpdateSchema } from '@/lib/validations/differentiation'

/**
 * PUT /api/marketplace/[id] — Update module subscription
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    const { id } = await params

    // Validate input
    const body = await req.json()
    const parsed = moduleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check ownership
    const userModule = await db.userModule.findFirst({
      where: { id, userId: user.id },
      include: { module: true },
    })

    if (!userModule) {
      return NextResponse.json(
        { error: 'Abonnement introuvable' },
        { status: 404 }
      )
    }

    const updated = await db.userModule.update({
      where: { id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.status === 'active' ? { activatedAt: new Date(), cancelledAt: null } : {}),
        ...(parsed.data.status === 'cancelled' ? { cancelledAt: new Date() } : {}),
      },
    })

    return NextResponse.json({
      message: `Statut du module ${userModule.module.name} mis à jour`,
      userModule: updated,
    })
  } catch (error) {
    console.error('Marketplace PUT error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du module' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/marketplace/[id] — Soft delete (cancel subscription)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    const { id } = await params

    // Check ownership
    const userModule = await db.userModule.findFirst({
      where: { id, userId: user.id },
      include: { module: true },
    })

    if (!userModule) {
      return NextResponse.json(
        { error: 'Abonnement introuvable' },
        { status: 404 }
      )
    }

    // Soft delete (cancel)
    const updated = await db.userModule.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json({
      message: `Abonnement à ${userModule.module.name} annulé`,
      userModule: updated,
    })
  } catch (error) {
    console.error('Marketplace DELETE error:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'annulation du module" },
      { status: 500 }
    )
  }
}
