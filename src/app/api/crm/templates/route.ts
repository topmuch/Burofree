/**
 * GET /api/crm/templates — List email templates
 * POST /api/crm/templates — Create email template
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireTeamAccess } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { emailTemplateCreateSchema, emailTemplateQuerySchema } from '@/lib/validations/crm'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const params = emailTemplateQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const where: Record<string, unknown> = { userId: auth.user.id }

    if (params.category) where.category = params.category
    if (params.teamId) where.teamId = params.teamId
    // If teamId is provided in query, verify team membership
    if (params.teamId) {
      const membership = await requireTeamAccess(auth.user.id, params.teamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { shortcut: { contains: params.search } },
        { subject: { contains: params.search } },
      ]
    }

    const [templates, total] = await Promise.all([
      db.emailTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      db.emailTemplate.count({ where }),
    ])

    return NextResponse.json({ templates, total, page: params.page, limit: params.limit })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Invalid query parameters', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const data = emailTemplateCreateSchema.parse(body)

    // If teamId is provided in body, verify team membership
    const teamId = data.teamId
    if (teamId) {
      const membership = await requireTeamAccess(auth.user.id, teamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }

    const template = await db.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject ?? undefined,
        contentHtml: data.contentHtml,
        contentMjml: data.contentMjml ?? undefined,
        variables: JSON.stringify(data.variables ?? []),
        category: data.category,
        shortcut: data.shortcut ?? undefined,
        isShared: data.isShared,
        isDefault: data.isDefault,
        thumbnail: data.thumbnail ?? undefined,
        userId: auth.user.id,
        teamId: data.teamId ?? undefined,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Failed to create template' }, { status: 500 })
  }
}
