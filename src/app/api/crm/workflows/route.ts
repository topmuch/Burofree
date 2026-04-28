/**
 * GET /api/crm/workflows — List workflows
 * POST /api/crm/workflows — Create workflow
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { workflowCreateSchema, workflowQuerySchema } from '@/lib/validations/crm'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const params = workflowQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const where: Record<string, unknown> = { userId: auth.user.id }

    if (params.isActive !== undefined) where.isActive = params.isActive
    if (params.teamId) where.teamId = params.teamId
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ]
    }

    const [workflows, total] = await Promise.all([
      db.workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          _count: { select: { executions: true } },
        },
      }),
      db.workflow.count({ where }),
    ])

    return NextResponse.json({ workflows, total, page: params.page, limit: params.limit })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const data = workflowCreateSchema.parse(body)

    const workflow = await db.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        trigger: JSON.stringify(data.trigger),
        actions: JSON.stringify(data.actions),
        isActive: data.isActive,
        isTest: data.isTest,
        userId: auth.user.id,
        teamId: data.teamId,
      },
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: (error as { errors: unknown[] }).errors }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create workflow' }, { status: 500 })
  }
}
