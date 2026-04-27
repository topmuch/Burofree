import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { getProvider } from '@/features/differentiation/integrations/provider'
import { z } from 'zod'

/**
 * GET /api/integrations — List user's connections
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

    // Validate query params (none expected, reject unknown params)
    const { searchParams } = new URL(req.url)
    const querySchema = z.object({}).strict()
    const queryParse = querySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!queryParse.success) {
      return NextResponse.json(
        { error: 'Paramètres de requête non reconnus', details: queryParse.error.flatten() },
        { status: 400 }
      )
    }

    // Get all connections
    const connections = await db.integrationConnection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    // Build result with health status
    const result = await Promise.all(
      connections.map(async (conn) => {
        const provider = getProvider(conn.provider)
        let health = { status: conn.status as string, message: '' }

        if (provider && conn.status === 'connected') {
          try {
            const healthCheck = await provider.healthCheck(user.id)
            health = { status: healthCheck.status, message: healthCheck.message || '' }
          } catch {
            health = { status: 'error', message: 'Vérification impossible' }
          }
        }

        return {
          id: conn.id,
          provider: conn.provider,
          status: conn.status,
          health,
          scopes: conn.scopes,
          metadata: conn.metadata,
          lastSyncAt: conn.lastSyncAt,
          lastError: conn.lastError,
          tokenExpiry: conn.tokenExpiry,
          createdAt: conn.createdAt,
        }
      })
    )

    // Also include available providers not yet connected
    const connectedProviders = new Set(connections.map(c => c.provider))
    const availableProviders = [
      { slug: 'slack', name: 'Slack', icon: 'MessageSquare' },
      { slug: 'zoom', name: 'Zoom', icon: 'Video' },
      { slug: 'google_drive', name: 'Google Drive', icon: 'HardDrive' },
      { slug: 'github', name: 'GitHub', icon: 'Github' },
      { slug: 'notion', name: 'Notion', icon: 'BookOpen' },
    ].map(p => ({
      ...p,
      connected: connectedProviders.has(p.slug),
    }))

    return NextResponse.json({
      connections: result,
      availableProviders,
    })
  } catch (error) {
    console.error('Integrations GET error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des intégrations' },
      { status: 500 }
    )
  }
}
