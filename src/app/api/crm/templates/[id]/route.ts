/**
 * GET /api/crm/templates/[id] — Get email template
 * PUT /api/crm/templates/[id] — Update email template
 * DELETE /api/crm/templates/[id] — Delete email template
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { emailTemplateUpdateSchema } from '@/lib/validations/crm'
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

  const template = await db.emailTemplate.findFirst({
    where: { id, userId: auth.user.id },
  })

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  return NextResponse.json(template)
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
    const data = emailTemplateUpdateSchema.parse(body)

    const existing = await db.emailTemplate.findFirst({ where: { id, userId: auth.user.id } })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.subject !== undefined) updateData.subject = data.subject
    if (data.contentHtml !== undefined) updateData.contentHtml = data.contentHtml
    if (data.contentMjml !== undefined) updateData.contentMjml = data.contentMjml
    if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables)
    if (data.category !== undefined) updateData.category = data.category
    if (data.shortcut !== undefined) updateData.shortcut = data.shortcut
    if (data.isShared !== undefined) updateData.isShared = data.isShared
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail

    const template = await db.emailTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(template)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
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

  const existing = await db.emailTemplate.findFirst({ where: { id, userId: auth.user.id } })
  if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  await db.emailTemplate.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
