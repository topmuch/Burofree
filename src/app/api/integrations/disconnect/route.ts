import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { integrationDisconnectSchema } from '@/lib/validations/differentiation'

/**
 * POST /api/integrations/disconnect — Disconnect an integration
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

    const body = await req.json()
    const parsed = integrationDisconnectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { provider: providerSlug } = parsed.data

    // Find connection
    const connection = await db.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: providerSlug,
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connexion introuvable' },
        { status: 404 }
      )
    }

    // Call provider disconnect
    const { getProvider } = await import('@/features/differentiation/integrations/provider')
    const provider = getProvider(providerSlug)
    if (provider) {
      await provider.disconnect(user.id)
    }

    // Delete connection
    await db.integrationConnection.delete({
      where: { id: connection.id },
    })

    return NextResponse.json({
      message: `Connexion à ${providerSlug} supprimée`,
    })
  } catch (error) {
    console.error('Integration disconnect POST error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    )
  }
}
