import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── GET — List automation logs with pagination and optional type filter ─────────
// Query params:
//   type       — filter by automation type (overdue_tasks, unpaid_invoices, meeting_reminder, email_followup)
//   action     — filter by action (notification_sent, email_sent, reminder_created)
//   success    — filter by success status ("true" / "false")
//   page       — page number, default 1
//   limit      — items per page, default 20, max 100

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Filters
    const type = searchParams.get('type')
    const action = searchParams.get('action')
    const success = searchParams.get('success')

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id }
    if (type) where.type = type
    if (action) where.action = action
    if (success !== null) where.success = success === 'true'

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
    return NextResponse.json({ error: 'Failed to fetch automation logs' }, { status: 500 })
  }
}
