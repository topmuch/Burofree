import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { createHmac } from 'crypto'
import { providerParamSchema } from '@/lib/validations/differentiation'

/**
 * POST /api/webhooks/[provider] — Webhook endpoint (PUBLIC)
 * Verifies HMAC signature, not session
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await params

    // Validate provider param
    const providerParse = providerParamSchema.safeParse(rawProvider)
    if (!providerParse.success) {
      return NextResponse.json(
        { error: `Fournisseur "${rawProvider}" non supporté`, details: providerParse.error.flatten() },
        { status: 400 }
      )
    }
    const provider = providerParse.data

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, `webhook:${provider}`)
    const rateLimit = checkRateLimit(rateLimitId, { maxRequests: 300, windowMs: 60 * 1000 })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429 }
      )
    }

    // Get raw body
    const rawBody = await req.text()

    // Verify HMAC signature
    const signature = req.headers.get('x-webhook-signature')
    if (!signature) {
      return NextResponse.json(
        { error: 'Signature manquante' },
        { status: 401 }
      )
    }

    const webhookSecret = process.env[`${provider.toUpperCase().replace(/-/g, '_')}_WEBHOOK_SECRET`]
      || 'burofree-webhook-dev-secret'

    const expectedSig = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSig) {
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 401 }
      )
    }

    // Parse payload
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Payload JSON invalide' },
        { status: 400 }
      )
    }

    // Process webhook based on provider
    // Return 200 quickly, process async
    switch (provider) {
      case 'slack': {
        // Handle Slack events
        const eventObj = payload.event as Record<string, unknown> | undefined
        const event_type = eventObj?.type as string | undefined
        if (event_type === 'url_verification') {
          // Slack challenge verification
          return NextResponse.json({ challenge: payload.challenge })
        }
        // Process Slack event asynchronously
        processSlackEvent(payload).catch(err =>
          console.error('Slack webhook processing error:', err)
        )
        break
      }
      case 'zoom': {
        processZoomEvent(payload).catch(err =>
          console.error('Zoom webhook processing error:', err)
        )
        break
      }
      case 'google_drive': {
        processGoogleDriveEvent(payload).catch(err =>
          console.error('Google Drive webhook processing error:', err)
        )
        break
      }
      case 'github': {
        processGitHubEvent(payload).catch(err =>
          console.error('GitHub webhook processing error:', err)
        )
        break
      }
      case 'notion': {
        processNotionEvent(payload).catch(err =>
          console.error('Notion webhook processing error:', err)
        )
        break
      }
      default:
        console.warn(`Unknown webhook provider: ${provider}`)
    }

    // Always return 200 quickly for webhooks
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook POST error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ─── Webhook processors (async, non-blocking) ──────────────────────────────────

async function processSlackEvent(payload: Record<string, unknown>) {
  const teamId = payload.team_id as string | undefined
  const event = payload.event as Record<string, unknown> | undefined
  if (!teamId || !event) return

  // Find connection by team ID in metadata
  const connections = await db.integrationConnection.findMany({
    where: { provider: 'slack', status: 'connected' },
  })

  const connection = connections.find(c => {
    try {
      const metadata = JSON.parse(c.metadata)
      return metadata.teamId === teamId
    } catch {
      return false
    }
  })

  if (!connection) return

  // Process based on event type
  console.log(`Processing Slack event for user ${connection.userId}:`, event.type)
}

async function processZoomEvent(payload: Record<string, unknown>) {
  const event = payload.event as string | undefined
  const payloadObj = payload.payload as Record<string, unknown> | undefined
  if (!event || !payloadObj) return

  console.log(`Processing Zoom event:`, event)
}

async function processGoogleDriveEvent(payload: Record<string, unknown>) {
  console.log('Processing Google Drive change notification')
}

async function processGitHubEvent(payload: Record<string, unknown>) {
  const action = payload.action as string | undefined
  const repository = payload.repository as Record<string, unknown> | undefined
  if (!action || !repository) return

  console.log(`Processing GitHub event: ${action} on ${(repository as Record<string, unknown>).full_name}`)
}

async function processNotionEvent(payload: Record<string, unknown>) {
  console.log('Processing Notion webhook event')
}
