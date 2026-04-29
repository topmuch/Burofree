import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  type GoogleCalendarEvent,
  type CalendarEventInput as GoogleCalendarEventInput,
} from '@/lib/google'
import {
  fetchOutlookCalendarEvents,
  createOutlookCalendarEvent,
  type OutlookCalendarEvent,
  type CalendarEventInput as OutlookCalendarEventInput,
} from '@/lib/microsoft'

/**
 * GET /api/calendar/sync
 *
 * Fetches events from Google Calendar or Outlook Calendar and syncs to local DB.
 * Handles deduplication using the event's remote ID stored in sourceId.
 * Supports two-way sync by detecting changes via field comparison.
 *
 * Query params:
 *   - accountId (optional): specific email account to sync
 *   - timeMin (optional): ISO date string for range start
 *   - timeMax (optional): ISO date string for range end
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const timeMinStr = searchParams.get('timeMin')
    const timeMaxStr = searchParams.get('timeMax')

    const timeMin = timeMinStr ? new Date(timeMinStr) : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    const timeMax = timeMaxStr ? new Date(timeMaxStr) : new Date(new Date().getFullYear(), new Date().getMonth() + 3, 1)

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Find the email account to sync
    let account = accountId
      ? await db.emailAccount.findUnique({ where: { id: accountId } })
      : await db.emailAccount.findFirst({ where: { userId: user.id, isPrimary: true } })

    if (!account) {
      account = await db.emailAccount.findFirst({ where: { userId: user.id } })
    }

    if (!account) {
      return NextResponse.json(
        { error: 'No email account connected. Please connect an email account first.' },
        { status: 400 },
      )
    }

    let syncedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    if (account.provider === 'gmail') {
      const googleEvents = await fetchGoogleCalendarEvents(account.id, timeMin, timeMax)

      for (const gEvent of googleEvents) {
        // Check if event already exists by sourceId (Google Calendar event ID)
        const existing = await db.calendarEvent.findFirst({
          where: { sourceId: gEvent.id },
        })

        if (existing) {
          // Update if needed (two-way sync: detect changes)
          const needsUpdate = googleEventNeedsUpdate(existing, gEvent)
          if (needsUpdate) {
            await db.calendarEvent.update({
              where: { id: existing.id },
              data: {
                title: gEvent.title,
                description: gEvent.description || null,
                startDate: new Date(gEvent.startDate),
                endDate: gEvent.endDate ? new Date(gEvent.endDate) : null,
                allDay: gEvent.allDay || false,
                location: gEvent.location || null,
                source: 'google',
              },
            })
            updatedCount++
          } else {
            skippedCount++
          }
        } else {
          // Create new event
          await db.calendarEvent.create({
            data: {
              title: gEvent.title,
              description: gEvent.description || null,
              startDate: new Date(gEvent.startDate),
              endDate: gEvent.endDate ? new Date(gEvent.endDate) : null,
              color: gEvent.color || '#10b981',
              allDay: gEvent.allDay || false,
              location: gEvent.location || null,
              type: 'meeting',
              source: 'google',
              sourceId: gEvent.id,
              userId: user.id,
            },
          })
          syncedCount++
        }
      }
    } else if (account.provider === 'outlook') {
      // Sync from Microsoft Outlook Calendar via Graph API
      const outlookEvents = await fetchOutlookCalendarEvents(account.id, timeMin, timeMax)

      for (const oEvent of outlookEvents) {
        // Check if event already exists by sourceId (Outlook event ID)
        const existing = await db.calendarEvent.findFirst({
          where: { sourceId: oEvent.id },
        })

        if (existing) {
          // Update if needed (two-way sync: detect changes)
          const needsUpdate = outlookEventNeedsUpdate(existing, oEvent)
          if (needsUpdate) {
            await db.calendarEvent.update({
              where: { id: existing.id },
              data: {
                title: oEvent.title,
                description: oEvent.description || null,
                startDate: new Date(oEvent.startDate),
                endDate: oEvent.endDate ? new Date(oEvent.endDate) : null,
                allDay: oEvent.isAllDay || false,
                location: oEvent.location || null,
                source: 'outlook',
              },
            })
            updatedCount++
          } else {
            skippedCount++
          }
        } else {
          // Create new event
          await db.calendarEvent.create({
            data: {
              title: oEvent.title,
              description: oEvent.description || null,
              startDate: new Date(oEvent.startDate),
              endDate: oEvent.endDate ? new Date(oEvent.endDate) : null,
              color: '#10b981',
              allDay: oEvent.isAllDay || false,
              location: oEvent.location || null,
              type: 'meeting',
              source: 'outlook',
              sourceId: oEvent.id,
              userId: user.id,
            },
          })
          syncedCount++
        }
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${account.provider}` },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      updated: updatedCount,
      skipped: skippedCount,
    })
  } catch (error) {
    console.error('Calendar sync error:', error)
    const message = error instanceof Error ? error.message : 'Failed to sync calendar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/calendar/sync
 *
 * Pushes a local event to Google Calendar or Outlook Calendar.
 * Creates the event remotely and stores the remote ID as sourceId.
 *
 * Body:
 *   - eventId: local event ID to push
 *   - accountId (optional): specific email account to use
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, accountId } = body

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Find the local event
    const localEvent = await db.calendarEvent.findFirst({
      where: { id: eventId, userId: user.id },
    })

    if (!localEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // If already synced (has sourceId), update instead
    if (localEvent.sourceId) {
      return NextResponse.json(
        { error: 'Event already synced to remote calendar. Use PUT to update.' },
        { status: 400 },
      )
    }

    // Find the account to use
    let account = accountId
      ? await db.emailAccount.findUnique({ where: { id: accountId } })
      : await db.emailAccount.findFirst({ where: { userId: user.id, isPrimary: true } })

    if (!account) {
      account = await db.emailAccount.findFirst({ where: { userId: user.id } })
    }

    if (!account) {
      return NextResponse.json(
        { error: 'No email account connected.' },
        { status: 400 },
      )
    }

    if (account.provider === 'gmail') {
      // Push to Google Calendar
      const eventInput: GoogleCalendarEventInput = {
        title: localEvent.title,
        description: localEvent.description || undefined,
        startDate: localEvent.startDate.toISOString(),
        endDate: localEvent.endDate?.toISOString() || undefined,
        location: localEvent.location || undefined,
        allDay: localEvent.allDay,
      }

      const createdEvent = await createGoogleCalendarEvent(account.id, eventInput)

      // Update local event with the Google ID
      const updated = await db.calendarEvent.update({
        where: { id: localEvent.id },
        data: {
          sourceId: createdEvent.id,
          source: 'google',
        },
      })

      return NextResponse.json({ success: true, event: updated })
    } else if (account.provider === 'outlook') {
      // Push to Outlook Calendar via Microsoft Graph API
      const eventInput: OutlookCalendarEventInput = {
        title: localEvent.title,
        description: localEvent.description || undefined,
        startDate: localEvent.startDate.toISOString(),
        endDate: localEvent.endDate?.toISOString() || undefined,
        location: localEvent.location || undefined,
        isAllDay: localEvent.allDay,
      }

      const createdEvent = await createOutlookCalendarEvent(account.id, eventInput)

      // Update local event with the Outlook ID
      const updated = await db.calendarEvent.update({
        where: { id: localEvent.id },
        data: {
          sourceId: createdEvent.id,
          source: 'outlook',
        },
      })

      return NextResponse.json({ success: true, event: updated })
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${account.provider}` },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('Calendar push error:', error)
    const message = error instanceof Error ? error.message : 'Failed to push event to calendar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Check if a local event needs to be updated from a remote Google event.
 * Compares key fields to detect changes.
 */
function googleEventNeedsUpdate(
  local: { title: string; description: string | null; startDate: Date; endDate: Date | null; allDay: boolean; location: string | null; updatedAt: Date },
  remote: GoogleCalendarEvent,
): boolean {
  if (local.title !== remote.title) return true
  if ((local.description || '') !== (remote.description || '')) return true
  if (local.allDay !== (remote.allDay || false)) return true
  if ((local.location || '') !== (remote.location || '')) return true

  // Compare dates (allowing for minor timezone differences)
  const localStart = new Date(local.startDate).getTime()
  const remoteStart = new Date(remote.startDate).getTime()
  if (Math.abs(localStart - remoteStart) > 60000) return true // 1 minute tolerance

  if (local.endDate && remote.endDate) {
    const localEnd = new Date(local.endDate).getTime()
    const remoteEnd = new Date(remote.endDate).getTime()
    if (Math.abs(localEnd - remoteEnd) > 60000) return true
  } else if (local.endDate !== (remote.endDate ? new Date(remote.endDate) : null)) {
    return true
  }

  return false
}

/**
 * Check if a local event needs to be updated from a remote Outlook event.
 * Compares key fields to detect changes.
 */
function outlookEventNeedsUpdate(
  local: { title: string; description: string | null; startDate: Date; endDate: Date | null; allDay: boolean; location: string | null; updatedAt: Date },
  remote: OutlookCalendarEvent,
): boolean {
  if (local.title !== remote.title) return true
  if ((local.description || '') !== (remote.description || '')) return true
  if (local.allDay !== (remote.isAllDay || false)) return true
  if ((local.location || '') !== (remote.location || '')) return true

  // Compare dates (allowing for minor timezone differences)
  const localStart = new Date(local.startDate).getTime()
  const remoteStart = new Date(remote.startDate).getTime()
  if (Math.abs(localStart - remoteStart) > 60000) return true // 1 minute tolerance

  if (local.endDate && remote.endDate) {
    const localEnd = new Date(local.endDate).getTime()
    const remoteEnd = new Date(remote.endDate).getTime()
    if (Math.abs(localEnd - remoteEnd) > 60000) return true
  } else if (local.endDate !== (remote.endDate ? new Date(remote.endDate) : null)) {
    return true
  }

  return false
}
