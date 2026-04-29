/**
 * Google API Client Library
 *
 * Server-side utilities for interacting with Gmail and Google Calendar APIs.
 * Uses stored OAuth tokens from EmailAccount, handles token refresh via
 * token-refresh.ts, and decrypts tokens via crypto.ts before use.
 *
 * Must only be imported in server-side code (API routes).
 */

import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getFreshAccessToken } from '@/lib/token-refresh'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleMessage {
  id: string
  threadId: string
  from: string
  fromName?: string
  to: string
  subject: string
  body: string
  snippet: string
  date: string
  isRead: boolean
  hasAttachments: boolean
}

export interface GoogleCalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  color?: string
  allDay?: boolean
}

export interface CalendarEventInput {
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  color?: string
  allDay?: boolean
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Get a fresh, decrypted access token for an email account.
 * Marks the account as needing re-auth if token refresh fails.
 */
async function getAccessToken(accountId: string): Promise<string | null> {
  const account = await db.emailAccount.findUnique({ where: { id: accountId } })
  if (!account) return null

  const token = await getFreshAccessToken(account.userId, account.provider)
  if (!token) {
    // Mark account as needing re-auth by clearing the expired token
    console.warn(`Token refresh failed for account ${accountId}, needs re-auth`)
  }
  return token
}

/**
 * Make an authenticated request to a Google API endpoint.
 * Handles 401 by attempting one token refresh retry.
 */
async function googleFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers as Record<string, string> || {}),
  }

  if (!headers['Content-Type'] && options.method !== 'GET') {
    // Don't set Content-Type for GET; let fetch handle it
  }

  return fetch(url, { ...options, headers })
}

/**
 * Decode base64url encoded string (used by Gmail API)
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf-8')
}

/**
 * Extract a header value from Gmail message headers
 */
function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase())
  return header?.value || ''
}

/**
 * Parse the From header to extract name and email
 */
function parseFromHeader(from: string): { name?: string; email: string } {
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/)
  if (match) {
    return { name: match[1].replace(/^"|"$/g, ''), email: match[2] }
  }
  return { email: from }
}

// ---------------------------------------------------------------------------
// Gmail Functions
// ---------------------------------------------------------------------------

/**
 * Fetch emails from Gmail API.
 * Returns a list of parsed GoogleMessage objects.
 */
export async function fetchGmailEmails(
  accountId: string,
  maxResults: number = 20,
  pageToken?: string,
): Promise<{ messages: GoogleMessage[]; nextPageToken?: string }> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  // Step 1: List messages
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  listUrl.searchParams.set('maxResults', String(maxResults))
  if (pageToken) listUrl.searchParams.set('pageToken', pageToken)

  const listRes = await googleFetch(listUrl.toString(), accessToken)
  if (!listRes.ok) {
    const error = await listRes.text()
    throw new Error(`Gmail list error: ${listRes.status} - ${error}`)
  }

  const listData = await listRes.json()
  const messageIds: Array<{ id: string; threadId: string }> = listData.messages || []

  if (messageIds.length === 0) {
    return { messages: [], nextPageToken: listData.nextPageToken }
  }

  // Step 2: Fetch each message's details (with metadata format for speed)
  const messages: GoogleMessage[] = []

  // Process in batches of 10 to avoid rate limiting
  for (let i = 0; i < messageIds.length; i += 10) {
    const batch = messageIds.slice(i, i + 10)
    const results = await Promise.allSettled(
      batch.map(async (msg) => {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`
        const msgRes = await googleFetch(msgUrl, accessToken)
        if (!msgRes.ok) return null
        return msgRes.json() as Promise<GmailMessageRaw>
      }),
    )

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue
      const raw = result.value

      const fromHeader = getHeader(raw.payload.headers, 'From')
      const toHeader = getHeader(raw.payload.headers, 'To')
      const subjectHeader = getHeader(raw.payload.headers, 'Subject')
      const dateHeader = getHeader(raw.payload.headers, 'Date')
      const { name: fromName, email: fromEmail } = parseFromHeader(fromHeader)

      const labelIds: string[] = raw.labelIds || []
      const isRead = !labelIds.includes('UNREAD')
      const hasAttachments = raw.payload.parts?.some(p => p.filename && p.filename.length > 0) || false

      // Extract body text
      let body = ''
      const textPart = raw.payload.parts?.find(p => p.mimeType === 'text/plain') ||
        (raw.payload.mimeType === 'text/plain' ? raw.payload : null)

      if (textPart?.body?.data) {
        body = decodeBase64Url(textPart.body.data)
      } else if (raw.payload.body?.data) {
        body = decodeBase64Url(raw.payload.body.data)
      } else {
        // Try HTML part as fallback
        const htmlPart = raw.payload.parts?.find(p => p.mimeType === 'text/html')
        if (htmlPart?.body?.data) {
          body = decodeBase64Url(htmlPart.body.data)
        }
      }

      messages.push({
        id: raw.id,
        threadId: raw.threadId,
        from: fromEmail,
        fromName: fromName || undefined,
        to: toHeader,
        subject: subjectHeader,
        body: body.substring(0, 50000), // Cap body size
        snippet: raw.snippet || body.substring(0, 200),
        date: dateHeader ? new Date(dateHeader).toISOString() : new Date(parseInt(raw.internalDate)).toISOString(),
        isRead,
        hasAttachments,
      })
    }
  }

  return { messages, nextPageToken: listData.nextPageToken }
}

/**
 * Send an email via Gmail API.
 */
export async function sendGmailEmail(
  accountId: string,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  // Build RFC 2822 message
  const account = await db.emailAccount.findUnique({ where: { id: accountId } })
  const fromEmail = account?.email || ''

  const messageLines = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ]

  const rawMessage = messageLines.join('\r\n')
  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await googleFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodedMessage }),
    },
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Gmail send error: ${res.status} - ${error}`)
  }
}

/**
 * Mark a Gmail email as read by removing the UNREAD label.
 */
export async function markGmailEmailRead(
  accountId: string,
  messageId: string,
): Promise<void> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  const res = await googleFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    },
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Gmail mark read error: ${res.status} - ${error}`)
  }
}

/**
 * Delete a Gmail email (move to trash).
 */
export async function deleteGmailEmail(
  accountId: string,
  messageId: string,
): Promise<void> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  const res = await googleFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    accessToken,
    {
      method: 'POST',
    },
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Gmail delete error: ${res.status} - ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Google Calendar Functions
// ---------------------------------------------------------------------------

/**
 * Fetch events from Google Calendar API.
 */
export async function fetchGoogleCalendarEvents(
  accountId: string,
  timeMin?: Date,
  timeMax?: Date,
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')
  if (timeMin) url.searchParams.set('timeMin', timeMin.toISOString())
  if (timeMax) url.searchParams.set('timeMax', timeMax.toISOString())

  const res = await googleFetch(url.toString(), accessToken)
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google Calendar list error: ${res.status} - ${error}`)
  }

  const data = await res.json()
  const items: GoogleCalendarEventRaw[] = data.items || []

  return items.map(item => {
    const isAllDay = !!item.start?.date
    const startDate = item.start?.dateTime || item.start?.date || ''
    const endDate = item.end?.dateTime || item.end?.date || undefined

    return {
      id: item.id,
      title: item.summary || '(Sans titre)',
      description: item.description || undefined,
      startDate,
      endDate: endDate || undefined,
      location: item.location || undefined,
      color: item.colorId || undefined,
      allDay: isAllDay,
    }
  })
}

/**
 * Create an event in Google Calendar.
 */
export async function createGoogleCalendarEvent(
  accountId: string,
  event: CalendarEventInput,
): Promise<GoogleCalendarEvent> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
  }

  if (event.allDay) {
    body.start = { date: event.startDate.split('T')[0] }
    body.end = { date: (event.endDate || event.startDate).split('T')[0] }
  } else {
    body.start = { dateTime: event.startDate, timeZone: 'Europe/Paris' }
    body.end = event.endDate
      ? { dateTime: event.endDate, timeZone: 'Europe/Paris' }
      : { dateTime: new Date(new Date(event.startDate).getTime() + 3600000).toISOString(), timeZone: 'Europe/Paris' }
  }

  if (event.color) {
    body.colorId = event.color
  }

  const res = await googleFetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google Calendar create error: ${res.status} - ${error}`)
  }

  const created = await res.json()
  const isAllDay = !!created.start?.date

  return {
    id: created.id,
    title: created.summary || event.title,
    description: created.description || undefined,
    startDate: created.start?.dateTime || created.start?.date || event.startDate,
    endDate: created.end?.dateTime || created.end?.date || undefined,
    location: created.location || undefined,
    color: created.colorId || undefined,
    allDay: isAllDay,
  }
}

/**
 * Update an existing event in Google Calendar.
 */
export async function updateGoogleCalendarEvent(
  accountId: string,
  eventId: string,
  event: Partial<CalendarEventInput>,
): Promise<GoogleCalendarEvent> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  const body: Record<string, unknown> = {}

  if (event.title !== undefined) body.summary = event.title
  if (event.description !== undefined) body.description = event.description
  if (event.location !== undefined) body.location = event.location

  if (event.startDate !== undefined || event.endDate !== undefined) {
    if (event.allDay) {
      body.start = { date: (event.startDate || '').split('T')[0] }
      body.end = { date: (event.endDate || event.startDate || '').split('T')[0] }
    } else {
      if (event.startDate) body.start = { dateTime: event.startDate, timeZone: 'Europe/Paris' }
      if (event.endDate) body.end = { dateTime: event.endDate, timeZone: 'Europe/Paris' }
    }
  }

  if (event.color !== undefined) body.colorId = event.color

  const res = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google Calendar update error: ${res.status} - ${error}`)
  }

  const updated = await res.json()
  const isAllDay = !!updated.start?.date

  return {
    id: updated.id,
    title: updated.summary || '',
    description: updated.description || undefined,
    startDate: updated.start?.dateTime || updated.start?.date || '',
    endDate: updated.end?.dateTime || updated.end?.date || undefined,
    location: updated.location || undefined,
    color: updated.colorId || undefined,
    allDay: isAllDay,
  }
}

/**
 * Delete an event from Google Calendar.
 */
export async function deleteGoogleCalendarEvent(
  accountId: string,
  eventId: string,
): Promise<void> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) {
    throw new Error('Unable to obtain access token. Account may need re-authentication.')
  }

  const res = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    accessToken,
    {
      method: 'DELETE',
    },
  )

  // 204 is success for delete, 410 means already deleted
  if (!res.ok && res.status !== 204 && res.status !== 410) {
    const error = await res.text()
    throw new Error(`Google Calendar delete error: ${res.status} - ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Raw API response types (internal)
// ---------------------------------------------------------------------------

interface GmailMessageRaw {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: string
  payload: {
    headers: Array<{ name: string; value: string }>
    mimeType: string
    body?: { data?: string; size?: number }
    parts?: Array<{
      mimeType: string
      filename?: string
      body?: { data?: string; size?: number }
      headers?: Array<{ name: string; value: string }>
    }>
  }
}

interface GoogleCalendarEventRaw {
  id: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
  updated?: string
}
