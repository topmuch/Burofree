import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { logsQuerySchema } from '@/lib/validations/productivity'

// ─── GET — List automation logs with pagination and optional type filter ─────────
// Query params:
//   type       — filter by automation type (overdue_tasks, unpaid_invoices, meeting_reminder, email_followup)
//   action     — filter by action (notification_sent, email_sent, reminder_created)
//   success    — filter by success status ("true" / "false")
//   page       — page number, default 1
//   limit      — items per page, default 20, max 100

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    // Validate query params
    const { searchParams } = new URL(req.url)
    const queryParse = logsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!queryParse.success) {
      return NextResponse.json(
        { error: 'Paramètres de requête invalides', details: queryParse.error.flatten() },
        { status: 400 }
      )
    }
    const { type, action, success, page, limit } = queryParse.data

    // Pagination
    const skip = (page - 1) * limit

    // Build where clause — fix: only filter on success if the param was explicitly provided
    const where: Record<string, unknown> = { userId: user.id }
    if (type) where.type = type
    if (action) where.action = action
    if (searchParams.has('success')) where.success = success === 'true'

    // Fetch logs and total count in parallel
    const [logs, total] = await Promise.all([
      db.automationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.automationLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Automation logs GET error:', error)
    return NextResponse.json({ error: 'Échec du chargement des journaux d\'automatisation' }, { status: 500 })
  }
}
