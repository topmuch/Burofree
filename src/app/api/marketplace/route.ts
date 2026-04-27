import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { moduleSubscribeSchema } from '@/lib/validations/differentiation'

/**
 * GET /api/marketplace — List all active modules with user's subscription status
 */
export async function GET(req: NextRequest) {
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

    // Fetch all active modules
    const modules = await db.module.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    // Fetch user's subscriptions
    const userModules = await db.userModule.findMany({
      where: { userId: user.id },
      include: { module: true },
    })

    // Build a map for quick lookup
    const userModuleMap = new Map(userModules.map(um => [um.moduleId, um]))

    // Combine module info with user status
    const result = modules.map(mod => {
      const userMod = userModuleMap.get(mod.id)
      return {
        id: mod.id,
        slug: mod.slug,
        name: mod.name,
        description: mod.description,
        icon: mod.icon,
        category: mod.category,
        price: mod.price,
        features: mod.features,
        sortOrder: mod.sortOrder,
        userStatus: userMod?.status || null,
        userExpiresAt: userMod?.expiresAt || null,
        userTrialEndsAt: userMod?.trialEndsAt || null,
      }
    })

    return NextResponse.json({ modules: result })
  } catch (error) {
    console.error('Marketplace GET error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du marketplace' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/marketplace — Subscribe/unsubscribe to a module
 */
export async function POST(req: NextRequest) {
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

    // Validate input
    const body = await req.json()
    const parsed = moduleSubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { moduleId, action } = parsed.data

    // Check module exists
    const mod = await db.module.findUnique({ where: { id: moduleId } })
    if (!mod) {
      return NextResponse.json({ error: 'Module introuvable' }, { status: 404 })
    }

    // Check existing subscription
    const existing = await db.userModule.findUnique({
      where: { userId_moduleId: { userId: user.id, moduleId } },
    })

    switch (action) {
      case 'subscribe':
      case 'trial': {
        if (existing && existing.status !== 'cancelled' && existing.status !== 'expired') {
          return NextResponse.json(
            { error: 'Vous êtes déjà abonné à ce module' },
            { status: 409 }
          )
        }

        const now = new Date()
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days trial

        const userModule = existing
          ? await db.userModule.update({
              where: { id: existing.id },
              data: {
                status: 'trial',
                trialStartsAt: now,
                trialEndsAt: trialEnd,
                activatedAt: null,
                cancelledAt: null,
                expiresAt: trialEnd,
              },
            })
          : await db.userModule.create({
              data: {
                userId: user.id,
                moduleId,
                status: 'trial',
                trialStartsAt: now,
                trialEndsAt: trialEnd,
                expiresAt: trialEnd,
              },
            })

        return NextResponse.json({
          message: `Essai gratuit de 7 jours activé pour ${mod.name}`,
          userModule,
        })
      }

      case 'cancel': {
        if (!existing || existing.status === 'cancelled') {
          return NextResponse.json(
            { error: 'Aucun abonnement actif à annuler' },
            { status: 404 }
          )
        }

        const updated = await db.userModule.update({
          where: { id: existing.id },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
          },
        })

        return NextResponse.json({
          message: `Abonnement à ${mod.name} annulé`,
          userModule: updated,
        })
      }

      case 'reactivate': {
        if (!existing || existing.status !== 'cancelled') {
          return NextResponse.json(
            { error: "Aucun abonnement annulé à réactiver" },
            { status: 404 }
          )
        }

        const now = new Date()
        const updated = await db.userModule.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            activatedAt: now,
            cancelledAt: null,
            expiresAt: null, // Active subscription has no expiration
          },
        })

        return NextResponse.json({
          message: `Abonnement à ${mod.name} réactivé`,
          userModule: updated,
        })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Marketplace POST error:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'abonnement au module" },
      { status: 500 }
    )
  }
}
