/**
 * POST /api/crm/workflows/[id]/execute — Test execute a workflow
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { workflowExecuteSchema } from '@/lib/validations/crm'
import { executeWorkflow } from '@/features/automation/services/workflow-engine'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const req = _req
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), { maxRequests: 5, windowMs: 15 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = workflowExecuteSchema.parse(body)

    const execution = await executeWorkflow(id, {
      contactId: data.contactId,
      conversationId: data.conversationId,
      dealId: data.dealId,
      userId: auth.user.id,
      eventData: data.testData ?? {},
    })

    return NextResponse.json(execution)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Execution failed' }, { status: 500 })
  }
}
