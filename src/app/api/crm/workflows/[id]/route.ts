/**
 * GET /api/crm/workflows/[id] — Get workflow
 * PUT /api/crm/workflows/[id] — Update workflow
 * DELETE /api/crm/workflows/[id] — Delete workflow
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { workflowUpdateSchema } from '@/lib/validations/crm'
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

  const workflow = await db.workflow.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      executions: {
        orderBy: { startedAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  return NextResponse.json(workflow)
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
    const data = workflowUpdateSchema.parse(body)

    const existing = await db.workflow.findFirst({ where: { id, userId: auth.user.id } })
    if (!existing) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.trigger !== undefined) updateData.trigger = JSON.stringify(data.trigger)
    if (data.actions !== undefined) updateData.actions = JSON.stringify(data.actions)
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.isTest !== undefined) updateData.isTest = data.isTest

    const workflow = await db.workflow.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(workflow)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
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

  const existing = await db.workflow.findFirst({ where: { id, userId: auth.user.id } })
  if (!existing) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

  await db.workflow.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
