/**
 * GET /api/crm/campaigns/[id]/stats — Get campaign statistics
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import * as campaignSender from '@/features/campaigns/services/campaign-sender'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const req = _req
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params

  try {
    const stats = await campaignSender.getCampaignStats(id)
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to get stats' }, { status: 404 })
  }
}
