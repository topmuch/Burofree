import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { integrationConnectSchema } from '@/lib/validations/differentiation'
import { getProvider } from '@/features/differentiation/integrations/provider'
import { encrypt } from '@/lib/crypto'

/**
 * POST /api/integrations/connect — Start OAuth flow
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
    const parsed = integrationConnectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { provider: providerSlug, code, redirectUri } = parsed.data

    // Get provider
    const provider = getProvider(providerSlug)
    if (!provider) {
      return NextResponse.json(
        { error: `Fournisseur "${providerSlug}" non supporté` },
        { status: 400 }
      )
    }

    // Connect via provider
    const result = await provider.connect(user.id, code, redirectUri)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Échec de la connexion au fournisseur' },
        { status: 400 }
      )
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = result.accessToken ? encrypt(result.accessToken) : null
    const encryptedRefreshToken = result.refreshToken ? encrypt(result.refreshToken) : null

    // Upsert integration connection
    const connection = await db.integrationConnection.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: providerSlug,
        },
      },
      create: {
        userId: user.id,
        provider: providerSlug,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: result.tokenExpiry,
        scopes: result.scopes ? JSON.stringify(result.scopes) : null,
        metadata: result.metadata ? JSON.stringify(result.metadata) : '{}',
        status: 'connected',
        lastSyncAt: new Date(),
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: result.tokenExpiry,
        scopes: result.scopes ? JSON.stringify(result.scopes) : undefined,
        metadata: result.metadata ? JSON.stringify(result.metadata) : undefined,
        status: 'connected',
        lastSyncAt: new Date(),
        lastError: null,
      },
    })

    return NextResponse.json({
      message: `${provider.name} connecté avec succès`,
      connection: {
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        lastSyncAt: connection.lastSyncAt,
        metadata: connection.metadata,
      },
    })
  } catch (error) {
    console.error('Integration connect POST error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la connexion au service' },
      { status: 500 }
    )
  }
}
