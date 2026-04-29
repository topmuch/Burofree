/**
 * POST /api/crm/workflows/[id]/toggle — Enable/disable a workflow
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const req = _req
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params

  const workflow = await db.workflow.findFirst({ where: { id, userId: auth.user.id } })
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

  const updated = await db.workflow.update({
    where: { id },
    data: { isActive: !workflow.isActive },
  })

  return NextResponse.json(updated)
}
