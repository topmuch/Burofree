/**
 * GET /api/crm/campaigns/[id] — Get campaign with details
 * PUT /api/crm/campaigns/[id] — Update campaign
 * DELETE /api/crm/campaigns/[id] — Delete campaign
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { campaignUpdateSchema } from '@/lib/validations/crm'
import * as campaignSender from '@/features/campaigns/services/campaign-sender'
import { db } from '@/lib/db'

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
    const campaign = await campaignSender.getCampaign(id, auth.user.id)
    return NextResponse.json(campaign)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Campaign not found' }, { status: 404 })
  }
}

export async function PUT(
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
    const body = await req.json()
    const data = campaignUpdateSchema.parse(body)
    const campaign = await campaignSender.updateCampaign(id, auth.user.id, {
      name: data.name,
      subject: data.subject,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyTo: data.replyTo,
      previewText: data.previewText,
      contentHtml: data.contentHtml,
      contentMjml: data.contentMjml,
      scheduleAt: data.scheduleAt ? new Date(data.scheduleAt) : data.scheduleAt === null ? null : undefined,
      throttlePerHour: data.throttlePerHour,
      segmentIds: data.segmentIds,
      templateId: data.templateId,
      senderAddress: data.senderAddress,
      listUnsubscribe: data.listUnsubscribe,
      doubleOptIn: data.doubleOptIn,
      status: data.status,
    })
    return NextResponse.json(campaign)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update campaign' }, { status: 500 })
  }
}

export async function DELETE(
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
    const campaign = await db.campaign.findFirst({ where: { id, userId: auth.user.id } })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'sending') return NextResponse.json({ error: 'Cannot delete a sending campaign' }, { status: 400 })

    await db.campaign.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
