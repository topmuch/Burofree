import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runAutomationChecks } from '@/lib/automation-cron'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'

// ─── POST — Run automation checks manually ─────────────────────────────────────
// Scans for: overdue tasks, unpaid invoices, upcoming meetings, unanswered emails.
// Creates notifications and logs for each finding.
// Returns a summary of what was found and notified.

export async function POST(req: NextRequest) {
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

    const summary = await runAutomationChecks(user.id)

    // Log the overall check run
    await db.automationLog.create({
      data: {
        type: 'system',
        action: 'check_run',
        details: JSON.stringify({
          totalFound: summary.totalFound,
          totalNotified: summary.totalNotified,
          totalErrors: summary.totalErrors,
          results: summary.results.map((r) => ({
            type: r.type,
            found: r.found,
            notified: r.notified,
            errors: r.errors,
          })),
        }),
        success: summary.totalErrors === 0,
        userId: user.id,
      },
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Automation check POST error:', error)
    return NextResponse.json({ error: 'Échec de l\'exécution des vérifications automatiques' }, { status: 500 })
  }
}
