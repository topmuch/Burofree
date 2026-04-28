/**
 * GET /api/crm/campaigns — List campaigns
 * POST /api/crm/campaigns — Create campaign
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { campaignCreateSchema, campaignQuerySchema } from '@/lib/validations/crm'
import * as campaignSender from '@/features/campaigns/services/campaign-sender'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const params = campaignQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const result = await campaignSender.getCampaigns(auth.user.id, {
      status: params.status,
      search: params.search,
      teamId: params.teamId,
    }, { page: params.page, limit: params.limit })
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Invalid query parameters', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const data = campaignCreateSchema.parse(body)
    const campaign = await campaignSender.createCampaign(auth.user.id, {
      name: data.name,
      subject: data.subject,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyTo: data.replyTo,
      previewText: data.previewText,
      contentHtml: data.contentHtml,
      contentMjml: data.contentMjml,
      scheduleAt: data.scheduleAt ? new Date(data.scheduleAt) : undefined,
      throttlePerHour: data.throttlePerHour,
      segmentIds: data.segmentIds,
      templateId: data.templateId,
      senderAddress: data.senderAddress,
      listUnsubscribe: data.listUnsubscribe,
      doubleOptIn: data.doubleOptIn,
      teamId: data.teamId,
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 500 })
  }
}
