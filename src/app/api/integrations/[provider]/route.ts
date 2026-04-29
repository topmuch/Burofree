import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { getProvider } from '@/features/differentiation/integrations/provider'
import { providerParamSchema } from '@/lib/validations/differentiation'

/**
 * POST /api/integrations/[provider]/sync — Trigger sync
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
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

    const { provider: providerSlug } = await params

    // Validate provider param
    const providerParse = providerParamSchema.safeParse(providerSlug)
    if (!providerParse.success) {
      return NextResponse.json(
        { error: `Fournisseur "${providerSlug}" non supporté`, details: providerParse.error.flatten() },
        { status: 400 }
      )
    }

    // Check connection exists
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

    // Get provider and sync
    const provider = getProvider(providerSlug)
    if (!provider) {
      return NextResponse.json(
        { error: `Fournisseur "${providerSlug}" non supporté` },
        { status: 400 }
      )
    }

    const syncResult = await provider.sync(user.id)

    // Update connection
    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastError: syncResult.error || null,
        status: syncResult.success ? 'connected' : 'error',
      },
    })

    return NextResponse.json({
      message: syncResult.success
        ? `Synchronisation ${provider.name} réussie`
        : `Erreur de synchronisation ${provider.name}`,
      result: syncResult,
    })
  } catch (error) {
    console.error('Integration sync POST error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    )
  }
}
