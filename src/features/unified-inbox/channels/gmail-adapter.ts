/**
 * Gmail Channel Adapter for the Unified Inbox.
 * Implements ChannelAdapter using the Gmail API via googleapis.
 * Handles OAuth token refresh, incremental sync via historyId,
 * and normalizes Gmail messages to the UnifiedMessage format.
 */

import { google, gmail_v1 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { decrypt, encrypt } from '@/lib/crypto'
import { db } from '@/lib/db'
import type {
  ChannelAdapter,
  ChannelType,
  ProviderType,
  SendMessageParams,
  UnifiedMessage,
} from './types'

export class GmailAdapter implements ChannelAdapter {
  readonly provider: ProviderType = 'gmail'
  readonly channelType: ChannelType = 'email'

  private oauth2Client: OAuth2Client | null = null
  private gmail: gmail_v1.Gmail | null = null
  private connected = false

  constructor(
    private userId: string,
    private channelAccountId: string,
  ) {}

  /**
   * Establish connection to Gmail using stored OAuth credentials.
   * Decrypts tokens from ChannelAccount, refreshes if expired.
   */
  async connect(): Promise<void> {
    const account = await db.channelAccount.findUnique({
      where: { id: this.channelAccountId },
    })

    if (!account || !account.accessToken) {
      throw new Error(`ChannelAccount ${this.channelAccountId} not found or missing access token`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required')
    }

    // Decrypt tokens
    const accessToken = decrypt(account.accessToken)
    const refreshToken = account.refreshToken ? decrypt(account.refreshToken) : undefined

    this.oauth2Client = new OAuth2Client(clientId, clientSecret)
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: account.tokenExpiry ? new Date(account.tokenExpiry).getTime() : undefined,
    })

    // Handle token refresh events
    this.oauth2Client.on('tokens', async (tokens) => {
      const updateData: Record<string, unknown> = {}
      if (tokens.access_token) {
        updateData.accessToken = encrypt(tokens.access_token)
      }
      if (tokens.refresh_token) {
        updateData.refreshToken = encrypt(tokens.refresh_token)
      }
      if (tokens.expiry_date) {
        updateData.tokenExpiry = new Date(tokens.expiry_date)
      }
      if (Object.keys(updateData).length > 0) {
        await db.channelAccount.update({
          where: { id: this.channelAccountId },
          data: updateData,
        })
      }
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    this.connected = true
  }

  /**
   * Disconnect from Gmail and clean up resources.
   */
  async disconnect(): Promise<void> {
    this.gmail = null
    this.oauth2Client = null
    this.connected = false
  }

  /**
   * Fetch messages incrementally using Gmail history API.
   * Uses historyId as cursor for incremental sync.
   * @param sinceCursor - Gmail historyId (null for initial full sync)
   */
  async fetchIncremental(sinceCursor: string | null): Promise<{
    messages: UnifiedMessage[]
    cursor: string
  }> {
    this.ensureConnected()

    const messages: UnifiedMessage[] = []
    let newCursor = sinceCursor ?? ''

    try {
      if (sinceCursor) {
        // Incremental sync using history
        const historyResponse = await this.gmail!.users.history.list({
          userId: 'me',
          startHistoryId: sinceCursor,
          historyTypes: ['messageAdded'],
          maxResults: 500,
        })

        const histories = historyResponse.data.history ?? []
        for (const history of histories) {
          const addedMessages = history.messagesAdded ?? []
          for (const msgRef of addedMessages) {
            if (!msgRef.message?.id) continue
            try {
              const fullMessage = await this.gmail!.users.messages.get({
                userId: 'me',
                id: msgRef.message.id,
                format: 'full',
              })
              const unified = this.normalizeGmailMessage(fullMessage.data)
              if (unified) messages.push(unified)
            } catch {
              // Skip individual message errors during sync
            }
          }
        }

        newCursor = historyResponse.data.historyId?.toString() ?? sinceCursor
      } else {
        // Initial full sync — fetch recent messages
        const listResponse = await this.gmail!.users.messages.list({
          userId: 'me',
          maxResults: 50,
        })

        const messageIds = listResponse.data.messages ?? []
        for (const msgRef of messageIds) {
          if (!msgRef.id) continue
          try {
            const fullMessage = await this.gmail!.users.messages.get({
              userId: 'me',
              id: msgRef.id,
              format: 'full',
            })
            const unified = this.normalizeGmailMessage(fullMessage.data)
            if (unified) messages.push(unified)
          } catch {
            // Skip individual message errors during sync
          }
        }

        // Get current historyId as cursor
        const profile = await this.gmail!.users.getProfile({ userId: 'me' })
        newCursor = profile.data.historyId?.toString() ?? ''
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during Gmail sync'
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
   * Subscribe to real-time Gmail notifications via Pub/Sub.
   * Requires Google Cloud Pub/Sub setup.
   */
  async subscribeRealtime(callback: (msg: UnifiedMessage) => void): Promise<void> {
    // Gmail real-time requires Google Cloud Pub/Sub or push notifications.
    // This sets up a watch on the inbox.
    this.ensureConnected()

    const topicName = process.env.GMAIL_PUBSUB_TOPIC
    if (!topicName) {
      throw new Error('GMAIL_PUBSUB_TOPIC environment variable is required for real-time subscriptions')
    }

    await this.gmail!.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName,
      },
    })

    // Note: actual message processing happens via Pub/Sub push endpoint,
    // which would call fetchIncremental with the latest historyId
    // and then invoke the callback for each new message.
    void callback // Acknowledged — real implementation routes through Pub/Sub endpoint
  }

  /**
   * Send an email through Gmail.
   */
  async sendMessage(params: SendMessageParams): Promise<UnifiedMessage> {
    this.ensureConnected()

    const { to, subject, body, replyToMessageId } = params

    // Build raw email
    const lines: string[] = []
    lines.push(`To: ${to}`)
    if (subject) lines.push(`Subject: ${subject}`)
    lines.push('Content-Type: text/plain; charset=utf-8')
    lines.push('MIME-Version: 1.0')
    lines.push('')

    // Add reply headers if replying
    let threadId: string | undefined
    if (replyToMessageId) {
      try {
        const originalMsg = await this.gmail!.users.messages.get({
          userId: 'me',
          id: replyToMessageId,
          format: 'metadata',
          metadataHeaders: ['Message-Id', 'References', 'In-Reply-To'],
        })
        threadId = originalMsg.data.threadId ?? undefined
        const headers = originalMsg.data.payload?.headers ?? []
        const messageIdHeader = headers.find((h) => h.name?.toLowerCase() === 'message-id')
        if (messageIdHeader?.value) {
          lines.splice(2, 0, `In-Reply-To: ${messageIdHeader.value}`)
          lines.splice(3, 0, `References: ${messageIdHeader.value}`)
        }
      } catch {
        // If we can't find original message, send as new
      }
    }

    lines.push(body)

    const raw = Buffer.from(lines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const sendResponse = await this.gmail!.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId,
      },
    })

    const sentMessage = sendResponse.data

    return {
      externalId: sentMessage.id ?? '',
      externalThreadId: sentMessage.threadId ?? '',
      channel: 'email',
      provider: 'gmail',
      direction: 'outbound',
      senderName: '',
      subject: subject ?? '',
      body,
      attachments: [],
      timestamp: new Date(Number(sentMessage.internalDate) || Date.now()),
      rawMetadata: {
        labelIds: sentMessage.labelIds,
        snippet: sentMessage.snippet,
      },
    }
  }

  /**
   * Mark a Gmail message as read (remove UNREAD label).
   */
  async markRead(externalId: string): Promise<void> {
    this.ensureConnected()

    await this.gmail!.users.messages.modify({
      userId: 'me',
      id: externalId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    })
  }

  /**
   * Check the health of the Gmail connection.
   */
  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      this.ensureConnected()
      await this.gmail!.users.getProfile({ userId: 'me' })
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Gmail health check failed',
      }
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private ensureConnected(): void {
    if (!this.connected || !this.gmail) {
      throw new Error('GmailAdapter is not connected. Call connect() first.')
    }
  }

  /**
   * Normalize a Gmail API message to UnifiedMessage format.
   */
  private normalizeGmailMessage(msg: gmail_v1.Schema$Message): UnifiedMessage | null {
    if (!msg.id) return null

    const headers = msg.payload?.headers ?? []
    const getHeader = (name: string): string | undefined =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined

    const fromHeader = getHeader('from') ?? ''
    const toHeader = getHeader('to') ?? ''
    const subjectHeader = getHeader('subject') ?? ''
    const dateHeader = getHeader('date') ?? ''

    // Extract sender name and email
    const senderMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/)
    const senderName = senderMatch ? senderMatch[1].trim().replace(/^"|"$/g, '') : fromHeader
    const senderEmail = senderMatch ? senderMatch[2].trim() : fromHeader

    // Determine direction
    const labelIds = msg.labelIds ?? []
    const isSent = labelIds.includes('SENT')
    const direction = isSent ? 'outbound' as const : 'inbound' as const

    // Extract body
    const body = this.extractBody(msg.payload)

    // Extract attachments
    const attachments = this.extractAttachments(msg.payload)

    // Parse date
    const timestamp = msg.internalDate
      ? new Date(Number(msg.internalDate))
      : dateHeader
        ? new Date(dateHeader)
        : new Date()

    return {
      externalId: msg.id,
      externalThreadId: msg.threadId ?? msg.id,
      channel: 'email',
      provider: 'gmail',
      direction,
      senderName,
      senderEmail,
      recipientEmail: toHeader,
      subject: subjectHeader,
      body: body ?? '',
      bodyHtml: this.extractHtmlBody(msg.payload) ?? undefined,
      attachments,
      timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
      rawMetadata: {
        labelIds,
        snippet: msg.snippet,
        dateHeader,
      },
    }
  }

  /**
   * Extract plain text body from a Gmail message payload.
   */
  private extractBody(payload?: gmail_v1.Schema$MessagePart): string | null {
    if (!payload) return null

    // Check direct text/plain part
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }

    // Recursively search parts
    if (payload.parts) {
      for (const part of payload.parts) {
        const body = this.extractBody(part)
        if (body) return body
      }
    }

    return null
  }

  /**
   * Extract HTML body from a Gmail message payload.
   */
  private extractHtmlBody(payload?: gmail_v1.Schema$MessagePart): string | null {
    if (!payload) return null

    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const html = this.extractHtmlBody(part)
        if (html) return html
      }
    }

    return null
  }

  /**
   * Extract attachment metadata from a Gmail message payload.
   */
  private extractAttachments(payload?: gmail_v1.Schema$MessagePart): Array<{
    name: string
    url: string
    mimeType: string
    size: number
  }> {
    if (!payload) return []

    const attachments: Array<{ name: string; url: string; mimeType: string; size: number }> = []

    if (payload.filename && payload.body?.attachmentId) {
      attachments.push({
        name: payload.filename,
        url: payload.body.attachmentId, // Gmail attachment ID; actual download requires separate API call
        mimeType: payload.mimeType ?? 'application/octet-stream',
        size: payload.body.size ?? 0,
      })
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        attachments.push(...this.extractAttachments(part))
      }
    }

    return attachments
  }
}
