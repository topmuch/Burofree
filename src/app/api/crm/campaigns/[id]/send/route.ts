/**
 * POST /api/crm/campaigns/[id]/send — Send or schedule a campaign
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { campaignSendSchema } from '@/lib/validations/crm'
import * as campaignSender from '@/features/campaigns/services/campaign-sender'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const req = _req
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), { maxRequests: 10, windowMs: 15 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = campaignSendSchema.parse(body)

    if (data.action === 'schedule' && data.scheduleAt) {
      const campaign = await campaignSender.scheduleCampaign(id, auth.user.id, new Date(data.scheduleAt))
      return NextResponse.json(campaign)
    }

    // Send now
    const result = await campaignSender.sendCampaign(id, auth.user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Failed to send campaign' }, { status: 500 })
  }
}
