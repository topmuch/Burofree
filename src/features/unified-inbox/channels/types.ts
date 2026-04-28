/**
 * Channel Adapter Interface and types for the Unified Inbox.
 * Defines the contract that all channel adapters must implement.
 */

/** Supported channel types */
export type ChannelType = 'email' | 'whatsapp' | 'sms' | 'slack'

/** Supported provider types */
export type ProviderType = 'gmail' | 'outlook' | 'whatsapp' | 'twilio' | 'slack'

/** Maps provider to channel type */
export const PROVIDER_CHANNEL_MAP: Record<ProviderType, ChannelType> = {
  gmail: 'email',
  outlook: 'email',
  whatsapp: 'whatsapp',
  twilio: 'sms',
  slack: 'slack',
}

/**
 * A normalized message from any channel.
 * All channel adapters must produce messages in this format.
 */
export interface UnifiedMessage {
  /** Unique ID from the provider */
  externalId: string
  /** Thread / conversation ID from the provider */
  externalThreadId: string
  /** Channel type this message came from */
  channel: ChannelType
  /** Provider that produced this message */
  provider: ProviderType
  /** Message direction */
  direction: 'inbound' | 'outbound'
  /** Sender display name */
  senderName: string
  /** Sender email or identifier */
  senderEmail?: string
  /** Recipient identifier */
  recipientEmail?: string
  /** Subject line (mainly for email) */
  subject?: string
  /** Plain-text body */
  body: string
  /** Original HTML body (for email) */
  bodyHtml?: string
  /** Attachments metadata */
  attachments: Array<{
    name: string
    url: string
    mimeType: string
    size: number
  }>
  /** Message timestamp from the provider */
  timestamp: Date
  /** Provider-specific raw data */
  rawMetadata: Record<string, unknown>
}

/**
 * A normalized conversation from any channel.
 * All channel adapters must produce conversations in this format.
 */
export interface UnifiedConversation {
  /** Thread ID from the provider */
  externalThreadId: string
  /** Channel type */
  channel: ChannelType
  /** Subject or topic */
  subject?: string
  /** Messages in the conversation */
  messages: UnifiedMessage[]
  /** Participants (emails, phones, Slack IDs) */
  participants: Array<{
    identifier: string
    name?: string
    role: 'sender' | 'recipient' | 'cc' | 'bcc'
  }>
  /** Sync cursor for incremental fetching */
  cursor: string
}

/**
 * Parameters for sending a message through a channel adapter.
 */
export interface SendMessageParams {
  /** Recipient identifier (email, phone, Slack channel) */
  to: string
  /** Subject line (mainly for email) */
  subject?: string
  /** Message body */
  body: string
  /** ID of the message being replied to */
  replyToMessageId?: string
}

/**
 * Channel Adapter interface.
 * All channel adapters (Gmail, Outlook, WhatsApp, etc.) must implement this.
 */
export interface ChannelAdapter {
  /** The provider this adapter handles */
  readonly provider: ProviderType

  /** The channel type this adapter handles */
  readonly channelType: ChannelType

  /**
   * Establish connection to the provider.
   * Validates credentials and prepares the adapter for use.
   */
  connect(): Promise<void>

  /**
   * Disconnect from the provider and clean up resources.
   */
  disconnect(): Promise<void>

  /**
   * Fetch messages incrementally since the given cursor.
   * @param sinceCursor - Provider-specific cursor (null for initial fetch)
   * @returns New messages and the updated cursor
   */
  fetchIncremental(sinceCursor: string | null): Promise<{
    messages: UnifiedMessage[]
    cursor: string
  }>

  /**
   * Subscribe to real-time messages from the provider.
   * @param callback - Function called when a new message arrives
   */
  subscribeRealtime(callback: (msg: UnifiedMessage) => void): Promise<void>

  /**
   * Send an outbound message through the provider.
   * @param params - Message parameters
   * @returns The sent message in unified format
   */
  sendMessage(params: SendMessageParams): Promise<UnifiedMessage>

  /**
   * Mark a message as read on the provider side.
   * @param externalId - The provider's message ID
   */
  markRead(externalId: string): Promise<void>

  /**
   * Check the health of the provider connection.
   * @returns Health status with optional error message
   */
  healthCheck(): Promise<{ ok: boolean; error?: string }>
}
