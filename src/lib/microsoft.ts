/**
 * Microsoft Graph API Client
 *
 * Provides functions for interacting with Outlook Mail and Calendar
 * via the Microsoft Graph API v1.0.
 *
 * Uses stored OAuth tokens from EmailAccount, handles automatic
 * token refresh, and decrypts tokens before use.
 */

import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getFreshAccessToken } from '@/lib/token-refresh'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OutlookMessage {
  id: string
  from: string
  fromName?: string
  to: string
  subject: string
  body: string
  snippet: string
  date: string
  isRead: boolean
  hasAttachments: boolean
  conversationId: string
}

export interface OutlookCalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  isAllDay?: boolean
  seriesMasterId?: string
}

export interface CalendarEventInput {
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  isAllDay?: boolean
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Get a decrypted access token for the given email account.
 * Falls back to getFreshAccessToken which handles refresh logic.
 */
async function getAccessToken(accountId: string): Promise<string | null> {
  const account = await db.emailAccount.findUnique({ where: { id: accountId } })
  if (!account) return null

  // Use the centralized token refresh utility
  const token = await getFreshAccessToken(account.userId, 'outlook')
  return token
}

/**
 * Make an authenticated request to the Microsoft Graph API.
 * Automatically adds the Authorization header with the access token.
 */
async function graphRequest(
  accountId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response | null> {
  const accessToken = await getAccessToken(accountId)
  if (!accessToken) return null

  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://graph.microsoft.com/v1.0${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  // If token is expired/invalid, mark account as needing re-auth
  if (response.status === 401) {
    console.warn(`Microsoft Graph API returned 401 for account ${accountId}. Token may need re-auth.`)
    return null
  }

  return response
}

/**
 * Extract plain text from an HTML body by stripping tags.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/**
 * Generate a short snippet from a body string.
 */
function generateSnippet(body: string, maxLength: number = 120): string {
  const plain = htmlToPlainText(body)
  if (plain.length <= maxLength) return plain
  return plain.substring(0, maxLength).trim() + '...'
}

// ─── Outlook Mail Functions ──────────────────────────────────────────────────

/**
 * Fetch Outlook emails for a connected account.
 *
 * @param accountId - The EmailAccount ID
 * @param maxResults - Maximum number of messages to return (default: 25)
 * @returns Array of OutlookMessage objects
 */
export async function fetchOutlookEmails(
  accountId: string,
  maxResults: number = 25
): Promise<OutlookMessage[]> {
  const response = await graphRequest(
    accountId,
    `/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc&$select=id,subject,body,receivedDateTime,from,toRecipients,isRead,hasAttachments,conversationId`
  )

  if (!response || !response.ok) {
    console.error('Failed to fetch Outlook emails:', response?.status, response?.statusText)
    return []
  }

  const data = await response.json()
  const messages: OutlookMessage[] = (data.value || []).map((msg: Record<string, unknown>) => {
    const from = msg.from as Record<string, Record<string, string>> | undefined
    const toRecipients = msg.toRecipients as Record<string, Record<string, string>>[] | undefined
    const bodyObj = msg.body as Record<string, string> | undefined

    const fromEmail = from?.emailAddress?.address || ''
    const fromName = from?.emailAddress?.name || undefined
    const toEmail = toRecipients?.[0]?.emailAddress?.address || ''
    const bodyContent = bodyObj?.content || ''
    const bodyType = bodyObj?.contentType || 'text'

    const plainBody = bodyType === 'html' ? htmlToPlainText(bodyContent) : bodyContent

    return {
      id: msg.id as string,
      from: fromEmail,
      fromName,
      to: toEmail,
      subject: (msg.subject as string) || '(Sans objet)',
      body: plainBody,
      snippet: generateSnippet(bodyContent),
      date: msg.receivedDateTime as string,
      isRead: msg.isRead as boolean,
      hasAttachments: msg.hasAttachments as boolean,
      conversationId: msg.conversationId as string,
    }
  })

  return messages
}

/**
 * Send an email via Outlook using Microsoft Graph API.
 *
 * @param accountId - The EmailAccount ID
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Email body (plain text or HTML)
 */
export async function sendOutlookEmail(
  accountId: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const messagePayload = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: body.replace(/\n/g, '<br>'),
      },
      toRecipients: [
        {
          emailAddress: { address: to },
        },
      ],
    },
  }

  const response = await graphRequest(accountId, '/me/sendMail', {
    method: 'POST',
    body: JSON.stringify(messagePayload),
  })

  if (!response) {
    throw new Error('Failed to authenticate with Microsoft Graph API')
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to send Outlook email:', response.status, errorText)
    throw new Error(`Failed to send email: ${response.status}`)
  }
}

/**
 * Mark an Outlook email as read.
 *
 * @param accountId - The EmailAccount ID
 * @param messageId - The Outlook message ID
 */
export async function markOutlookEmailRead(
  accountId: string,
  messageId: string
): Promise<void> {
  const response = await graphRequest(
    accountId,
    `/me/messages/${messageId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    }
  )

  if (!response || !response.ok) {
    console.error('Failed to mark Outlook email as read:', response?.status)
  }
}

/**
 * Delete an Outlook email.
 *
 * @param accountId - The EmailAccount ID
 * @param messageId - The Outlook message ID
 */
export async function deleteOutlookEmail(
  accountId: string,
  messageId: string
): Promise<void> {
  const response = await graphRequest(
    accountId,
    `/me/messages/${messageId}`,
    { method: 'DELETE' }
  )

  if (!response || !response.ok) {
    console.error('Failed to delete Outlook email:', response?.status)
  }
}

// ─── Outlook Calendar Functions ──────────────────────────────────────────────

/**
 * Fetch Outlook calendar events for a given time range.
 *
 * @param accountId - The EmailAccount ID
 * @param timeMin - Start of the time range (default: now)
 * @param timeMax - End of the time range (default: 30 days from now)
 * @returns Array of OutlookCalendarEvent objects
 */
export async function fetchOutlookCalendarEvents(
  accountId: string,
  timeMin?: Date,
  timeMax?: Date
): Promise<OutlookCalendarEvent[]> {
  const start = timeMin || new Date()
  const end = timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const startStr = start.toISOString()
  const endStr = end.toISOString()

  const response = await graphRequest(
    accountId,
    `/me/calendar/calendarView?startDateTime=${encodeURIComponent(startStr)}&endDateTime=${encodeURIComponent(endStr)}&$select=id,subject,body,start,end,location,isAllDay,seriesMasterId`
  )

  if (!response || !response.ok) {
    console.error('Failed to fetch Outlook calendar events:', response?.status)
    return []
  }

  const data = await response.json()
  const events: OutlookCalendarEvent[] = (data.value || []).map((evt: Record<string, unknown>) => {
    const startObj = evt.start as Record<string, string> | undefined
    const endObj = evt.end as Record<string, string> | undefined
    const locationObj = evt.location as Record<string, string> | undefined
    const bodyObj = evt.body as Record<string, string> | undefined

    return {
      id: evt.id as string,
      title: (evt.subject as string) || '(Sans titre)',
      description: bodyObj?.content ? htmlToPlainText(bodyObj.content) : undefined,
      startDate: startObj?.dateTime || '',
      endDate: endObj?.dateTime || undefined,
      location: locationObj?.displayName || undefined,
      isAllDay: evt.isAllDay as boolean,
      seriesMasterId: (evt.seriesMasterId as string) || undefined,
    }
  })

  return events
}

/**
 * Create a new Outlook calendar event.
 *
 * @param accountId - The EmailAccount ID
 * @param event - The event data to create
 * @returns The created OutlookCalendarEvent
 */
export async function createOutlookCalendarEvent(
  accountId: string,
  event: CalendarEventInput
): Promise<OutlookCalendarEvent> {
  const isAllDay = event.isAllDay || false

  const eventPayload = {
    subject: event.title,
    body: {
      contentType: 'HTML',
      content: event.description || '',
    },
    start: {
      dateTime: event.startDate,
      timeZone: 'UTC',
    },
    end: {
      dateTime: event.endDate || event.startDate,
      timeZone: 'UTC',
    },
    location: {
      displayName: event.location || '',
    },
    isAllDay,
  }

  const response = await graphRequest(accountId, '/me/calendar/events', {
    method: 'POST',
    body: JSON.stringify(eventPayload),
  })

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : 'No response'
    console.error('Failed to create Outlook calendar event:', response?.status, errorText)
    throw new Error(`Failed to create calendar event: ${response?.status || 'auth error'}`)
  }

  const data = await response.json()
  const startObj = data.start as Record<string, string>
  const endObj = data.end as Record<string, string>
  const locationObj = data.location as Record<string, string>
  const bodyObj = data.body as Record<string, string>

  return {
    id: data.id,
    title: data.subject || '(Sans titre)',
    description: bodyObj?.content ? htmlToPlainText(bodyObj.content) : undefined,
    startDate: startObj?.dateTime || '',
    endDate: endObj?.dateTime || undefined,
    location: locationObj?.displayName || undefined,
    isAllDay: data.isAllDay || false,
    seriesMasterId: data.seriesMasterId || undefined,
  }
}

/**
 * Update an existing Outlook calendar event.
 *
 * @param accountId - The EmailAccount ID
 * @param eventId - The Outlook event ID
 * @param event - Partial event data to update
 * @returns The updated OutlookCalendarEvent
 */
export async function updateOutlookCalendarEvent(
  accountId: string,
  eventId: string,
  event: Partial<CalendarEventInput>
): Promise<OutlookCalendarEvent> {
  const eventPayload: Record<string, unknown> = {}

  if (event.title !== undefined) eventPayload.subject = event.title
  if (event.description !== undefined) {
    eventPayload.body = { contentType: 'HTML', content: event.description }
  }
  if (event.startDate !== undefined) {
    eventPayload.start = { dateTime: event.startDate, timeZone: 'UTC' }
  }
  if (event.endDate !== undefined) {
    eventPayload.end = { dateTime: event.endDate, timeZone: 'UTC' }
  }
  if (event.location !== undefined) {
    eventPayload.location = { displayName: event.location }
  }
  if (event.isAllDay !== undefined) {
    eventPayload.isAllDay = event.isAllDay
  }

  const response = await graphRequest(
    accountId,
    `/me/calendar/events/${eventId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(eventPayload),
    }
  )

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : 'No response'
    console.error('Failed to update Outlook calendar event:', response?.status, errorText)
    throw new Error(`Failed to update calendar event: ${response?.status || 'auth error'}`)
  }

  const data = await response.json()
  const startObj = data.start as Record<string, string>
  const endObj = data.end as Record<string, string>
  const locationObj = data.location as Record<string, string>
  const bodyObj = data.body as Record<string, string>

  return {
    id: data.id,
    title: data.subject || '(Sans titre)',
    description: bodyObj?.content ? htmlToPlainText(bodyObj.content) : undefined,
    startDate: startObj?.dateTime || '',
    endDate: endObj?.dateTime || undefined,
    location: locationObj?.displayName || undefined,
    isAllDay: data.isAllDay || false,
    seriesMasterId: data.seriesMasterId || undefined,
  }
}

/**
 * Delete an Outlook calendar event.
 *
 * @param accountId - The EmailAccount ID
 * @param eventId - The Outlook event ID
 */
export async function deleteOutlookCalendarEvent(
  accountId: string,
  eventId: string
): Promise<void> {
  const response = await graphRequest(
    accountId,
    `/me/calendar/events/${eventId}`,
    { method: 'DELETE' }
  )

  if (!response || !response.ok) {
    console.error('Failed to delete Outlook calendar event:', response?.status)
    throw new Error(`Failed to delete calendar event: ${response?.status || 'auth error'}`)
  }
}

/**
 * Check the health of a Microsoft account's connection.
 * Returns an object with status info including token validity and permissions.
 */
export async function checkOutlookAccountHealth(accountId: string): Promise<{
  isConnected: boolean
  tokenValid: boolean
  canReadMail: boolean
  canSendMail: boolean
  canAccessCalendar: boolean
  lastChecked: string
}> {
  const result = {
    isConnected: false,
    tokenValid: false,
    canReadMail: false,
    canSendMail: false,
    canAccessCalendar: false,
    lastChecked: new Date().toISOString(),
  }

  try {
    const account = await db.emailAccount.findUnique({ where: { id: accountId } })
    if (!account) return result

    // Check if we can get a valid access token
    const accessToken = await getAccessToken(accountId)
    if (!accessToken) return result

    result.tokenValid = true

    // Try to read mailbox
    const mailResponse = await graphRequest(accountId, '/me/messages?$top=1&$select=id')
    if (mailResponse?.ok) {
      result.canReadMail = true
    }

    // Check calendar access
    const calResponse = await graphRequest(accountId, '/me/calendar')
    if (calResponse?.ok) {
      result.canAccessCalendar = true
    }

    // Check scopes for send permission
    const scopes = account.scopes || ''
    result.canSendMail = scopes.includes('Mail.Send') || scopes.includes('Mail.ReadWrite')

    result.isConnected = result.canReadMail || result.canAccessCalendar
  } catch (error) {
    console.error('Error checking Outlook account health:', error)
  }

  return result
}
