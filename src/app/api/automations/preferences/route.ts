import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDefaultPreferences } from '@/lib/automation-cron'

// ─── GET — Retrieve all automation preferences for the current user ──────────────
// If the user has no preferences yet, create defaults automatically.

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Ensure defaults exist, then fetch the full list
    await ensureDefaultPreferences(user.id)

    const preferences = await db.automationPreference.findMany({
      where: { userId: user.id },
      orderBy: { type: 'asc' },
    })

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Automation preferences GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch automation preferences' }, { status: 500 })
  }
}

// ─── POST — Create or update an automation preference ───────────────────────────
// Body: { type: string, enabled?: boolean, channel?: string, frequency?: string, threshold?: number }
// Uses upsert on the unique [userId, type] constraint.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const validTypes = ['overdue_tasks', 'unpaid_invoices', 'meeting_reminder', 'email_followup']
    const validChannels = ['in_app', 'email', 'both']
    const validFrequencies = ['15min', '30min', '1h', 'daily']

    if (!body.type || !validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.channel && !validChannels.includes(body.channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.frequency && !validFrequencies.includes(body.frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.threshold !== undefined && (typeof body.threshold !== 'number' || body.threshold < 0)) {
      return NextResponse.json(
        { error: 'Threshold must be a non-negative number' },
        { status: 400 }
      )
    }

    // Fetch existing preference to merge updates
    const existing = await db.automationPreference.findUnique({
      where: { userId_type: { userId: user.id, type: body.type } },
    })

    const data = {
      enabled: body.enabled !== undefined ? body.enabled : existing?.enabled ?? true,
      channel: body.channel || existing?.channel || 'in_app',
      frequency: body.frequency || existing?.frequency || '15min',
      threshold: body.threshold !== undefined ? body.threshold : existing?.threshold ?? 7,
    }

    const preference = await db.automationPreference.upsert({
      where: { userId_type: { userId: user.id, type: body.type } },
      update: data,
      create: {
        type: body.type,
        ...data,
        userId: user.id,
      },
    })

    return NextResponse.json(preference)
  } catch (error) {
    console.error('Automation preferences POST error:', error)
    return NextResponse.json({ error: 'Failed to update automation preference' }, { status: 500 })
  }
}
