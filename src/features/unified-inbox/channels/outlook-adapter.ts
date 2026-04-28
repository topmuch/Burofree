/**
 * Outlook Channel Adapter for the Unified Inbox.
 * Implements ChannelAdapter using the Microsoft Graph API.
 * Handles OAuth token refresh, incremental sync via deltaToken,
 * and normalizes Outlook messages to the UnifiedMessage format.
 */

import { decrypt, encrypt } from '@/lib/crypto'
import { db } from '@/lib/db'
import type {
  ChannelAdapter,
  ChannelType,
  ProviderType,
  SendMessageParams,
  UnifiedMessage,
} from './types'

/** Microsoft Graph API base URL */
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

/** Outlook message representation from Graph API */
interface OutlookMessage {
  id: string
  conversationId: string
  subject?: string
  body?: { contentType: string; content: string }
  bodyPreview?: string
  from?: { emailAddress?: { name?: string; address?: string } }
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>
  receivedDateTime?: string
  sentDateTime?: string
  isRead?: boolean
  hasAttachments?: boolean
  internetMessageId?: string
  parentFolderId?: string
}

/** Delta response from Microsoft Graph */
interface OutlookDeltaResponse {
  value: OutlookMessage[]
  '@odata.deltaLink'?: string
  '@odata.nextLink'?: string
}

export class OutlookAdapter implements ChannelAdapter {
  readonly provider: ProviderType = 'outlook'
  readonly channelType: ChannelType = 'email'

  private accessToken: string | null = null
  private connected = false

  constructor(
    private userId: string,
    private channelAccountId: string,
  ) {}

  /**
   * Establish connection to Outlook using stored OAuth credentials.
   * Decrypts tokens from ChannelAccount, refreshes if expired.
   */
  async connect(): Promise<void> {
    const account = await db.channelAccount.findUnique({
      where: { id: this.channelAccountId },
    })

    if (!account || !account.accessToken) {
      throw new Error(`ChannelAccount ${this.channelAccountId} not found or missing access token`)
    }

    // Decrypt and set access token
    this.accessToken = decrypt(account.accessToken)

    // Check if token is expired and refresh if needed
    if (account.tokenExpiry && new Date(account.tokenExpiry) < new Date()) {
      await this.refreshToken(account.refreshToken ? decrypt(account.refreshToken) : null)
    }

    this.connected = true
  }

  /**
   * Disconnect from Outlook and clean up resources.
   */
  async disconnect(): Promise<void> {
    this.accessToken = null
    this.connected = false
  }

  /**
   * Fetch messages incrementally using Microsoft Graph delta query.
   * Uses deltaToken as cursor for incremental sync.
   * @param sinceCursor - Delta token URL (null for initial full sync)
   */
  async fetchIncremental(sinceCursor: string | null): Promise<{
    messages: UnifiedMessage[]
    cursor: string
  }> {
    this.ensureConnected()

    const messages: UnifiedMessage[] = []
    let newCursor = sinceCursor ?? ''

    try {
      let url: string
      if (sinceCursor) {
        // Incremental sync using delta link
        url = sinceCursor
      } else {
        // Initial full sync
        url = `${GRAPH_API_BASE}/me/messages?$top=50&$select=id,conversationId,subject,body,bodyPreview,from,toRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,internetMessageId`
      }

      const response = await this.graphFetch<OutlookDeltaResponse>(url)

      for (const msg of response.value ?? []) {
        const unified = this.normalizeOutlookMessage(msg)
        if (unified) messages.push(unified)
      }

      // Delta link is the cursor for next sync
      newCursor = response['@odata.deltaLink'] ?? sinceCursor ?? ''

      // Handle pagination for initial sync
      let nextLink = response['@odata.nextLink']
      while (nextLink) {
        const nextResponse = await this.graphFetch<OutlookDeltaResponse>(nextLink)
        for (const msg of nextResponse.value ?? []) {
          const unified = this.normalizeOutlookMessage(msg)
          if (unified) messages.push(unified)
        }
        newCursor = nextResponse['@odata.deltaLink'] ?? newCursor
        nextLink = nextResponse['@odata.nextLink']
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during Outlook sync'
      await db.channelAccount.update({
        where: { id: this.channelAccountId },
        data: { lastError: errorMsg },
      })
      throw error
    }

    // Update sync cursor
    await db.channelAccount.update({
      where: { id: this.channelAccountId },
      data: { lastSyncAt: new Date(), lastSyncCursor: newCursor, lastError: null },
    })

    return { messages, cursor: newCursor }
  }

  /**
   * Subscribe to real-time Outlook notifications via webhooks.
   * Requires a publicly accessible endpoint for Microsoft to call.
   */
  async subscribeRealtime(callback: (msg: UnifiedMessage) => void): Promise<void> {
    this.ensureConnected()

    const notificationUrl = process.env.OUTLOOK_NOTIFICATION_URL
    if (!notificationUrl) {
      throw new Error('OUTLOOK_NOTIFICATION_URL environment variable is required for real-time subscriptions')
    }

    // Create subscription
    await this.graphFetch(`${GRAPH_API_BASE}/subscriptions`, {
      method: 'POST',
      body: JSON.stringify({
        changeType: 'created',
        notificationUrl,
        resource: '/me/messages',
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Max 3 days
        clientState: `burofree-${this.userId}-${this.channelAccountId}`,
      }),
    })

    void callback // Acknowledged — actual message processing routes through webhook endpoint
  }

  /**
   * Send an email through Outlook via Microsoft Graph.
   */
  async sendMessage(params: SendMessageParams): Promise<UnifiedMessage> {
    this.ensureConnected()

    const { to, subject, body, replyToMessageId } = params

    const messagePayload: Record<string, unknown> = {
      subject: subject ?? '',
      body: {
        contentType: 'text',
        content: body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    }

    let sentData: { id?: string; conversationId?: string }

    if (replyToMessageId) {
      // Reply to existing message
      const replyResponse = await this.graphFetch<{ id?: string; conversationId?: string }>(
        `${GRAPH_API_BASE}/me/messages/${replyToMessageId}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({
            comment: body,
          }),
        },
      )
      sentData = replyResponse
    } else {
      // Send new message
      const sendResponse = await this.graphFetch<{ id?: string; conversationId?: string }>(
        `${GRAPH_API_BASE}/me/sendMail`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: messagePayload,
            saveToSentItems: true,
          }),
        },
      )
      sentData = sendResponse
    }

    return {
      externalId: sentData.id ?? '',
      externalThreadId: sentData.conversationId ?? '',
      channel: 'email',
      provider: 'outlook',
      direction: 'outbound',
      senderName: '',
      subject: subject ?? '',
      body,
      attachments: [],
      timestamp: new Date(),
      rawMetadata: {
        provider: 'outlook',
      },
    }
  }

  /**
   * Mark an Outlook message as read.
   */
  async markRead(externalId: string): Promise<void> {
    this.ensureConnected()

    await this.graphFetch(`${GRAPH_API_BASE}/me/messages/${externalId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    })
  }

  /**
   * Check the health of the Outlook connection.
   */
  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      this.ensureConnected()
      await this.graphFetch(`${GRAPH_API_BASE}/me`)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Outlook health check failed',
      }
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private ensureConnected(): void {
    if (!this.connected || !this.accessToken) {
      throw new Error('OutlookAdapter is not connected. Call connect() first.')
    }
  }

  /**
   * Refresh the OAuth access token using the refresh token.
   */
  private async refreshToken(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      throw new Error('No refresh token available for Outlook')
    }

    const clientId = process.env.OUTLOOK_CLIENT_ID
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
    const tenantId = process.env.OUTLOOK_TENANT_ID ?? 'common'

    if (!clientId || !clientSecret) {
      throw new Error('OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET environment variables are required')
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'https://graph.microsoft.com/.default',
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh Outlook token: ${response.status}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    this.accessToken = data.access_token

    // Update stored tokens
    const updateData: Record<string, unknown> = {
      accessToken: encrypt(data.access_token),
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    }
    if (data.refresh_token) {
      updateData.refreshToken = encrypt(data.refresh_token)
    }

    await db.channelAccount.update({
      where: { id: this.channelAccountId },
      data: updateData,
    })
  }

  /**
   * Make an authenticated request to the Microsoft Graph API.
   */
  private async graphFetch<T = unknown>(
    url: string,
    options?: RequestInit,
  ): Promise<T> {
    if (!this.accessToken) throw new Error('No access token')

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`Graph API error ${response.status}: ${errorBody}`)
    }

    // Handle 204 No Content (e.g., from sendMail)
    if (response.status === 204) {
      return {} as T
    }

    return response.json() as Promise<T>
  }

  /**
   * Normalize an Outlook Graph API message to UnifiedMessage format.
   */
  private normalizeOutlookMessage(msg: OutlookMessage): UnifiedMessage | null {
    if (!msg.id) return null

    const senderName = msg.from?.emailAddress?.name ?? ''
    const senderEmail = msg.from?.emailAddress?.address ?? ''
    const recipientEmail = msg.toRecipients?.[0]?.emailAddress?.address ?? ''

    const bodyContent = msg.body?.content ?? ''
    const bodyHtml = msg.body?.contentType === 'html' ? bodyContent : undefined
    const bodyText = msg.body?.contentType === 'text' ? bodyContent : msg.bodyPreview ?? ''

    const direction = msg.sentDateTime && !msg.receivedDateTime ? 'outbound' as const : 'inbound' as const
    const timestamp = msg.receivedDateTime
      ? new Date(msg.receivedDateTime)
      : msg.sentDateTime
        ? new Date(msg.sentDateTime)
        : new Date()

    return {
      externalId: msg.id,
      externalThreadId: msg.conversationId ?? msg.id,
      channel: 'email',
      provider: 'outlook',
      direction,
      senderName,
      senderEmail,
      recipientEmail,
      subject: msg.subject ?? '',
      body: bodyText,
      bodyHtml,
      attachments: [],
      timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
      rawMetadata: {
        internetMessageId: msg.internetMessageId,
        isRead: msg.isRead,
        hasAttachments: msg.hasAttachments,
        parentFolderId: msg.parentFolderId,
      },
    }
  }
}
