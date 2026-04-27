import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runAutomationChecks } from '@/lib/automation-cron'

// ─── POST — Run automation checks manually ─────────────────────────────────────
// Scans for: overdue tasks, unpaid invoices, upcoming meetings, unanswered emails.
// Creates notifications and logs for each finding.
// Returns a summary of what was found and notified.

export async function POST() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

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
    return NextResponse.json({ error: 'Failed to run automation checks' }, { status: 500 })
  }
}
