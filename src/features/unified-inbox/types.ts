/**
 * Frontend TypeScript types for the Unified Inbox module.
 * Matches the Prisma models but as plain TS interfaces for client-side use.
 */

// ─── Channel Types ────────────────────────────────────────────────────────────

export type ChannelType = 'email' | 'whatsapp' | 'sms' | 'slack'
export type ProviderType = 'gmail' | 'outlook' | 'whatsapp' | 'twilio' | 'slack'

export const PROVIDER_CHANNEL_MAP: Record<ProviderType, ChannelType> = {
  gmail: 'email',
  outlook: 'email',
  whatsapp: 'whatsapp',
  twilio: 'sms',
  slack: 'slack',
}

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface Contact {
  id: string
  name: string
  emails: string // JSON string[]
  phones: string // JSON string[]
  slackId: string | null
  telegramId: string | null
  preferredChannel: string
  customFields: string // JSON
  tags: string // JSON string[]
  avatar: string | null
  company: string | null
  notes: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ChannelAccount {
  id: string
  userId: string
  provider: string
  email: string | null
  accountId: string | null
  isActive: boolean
  lastSyncAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  externalThreadId: string | null
  channel: ChannelType
  status: 'open' | 'pending' | 'closed' | 'spam'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  subject: string | null
  lastActivityAt: string
  assignedToId: string | null
  projectId: string | null
  tags: string // JSON string[]
  metadata: string // JSON
  isStarred: boolean
  unreadCount: number
  userId: string
  createdAt: string
  updatedAt: string
  // Relations (when included)
  messages?: InboxMessage[]
  participants?: ConversationParticipant[]
  internalNotes?: InternalNote[]
  events?: ConversationEvent[]
  _count?: {
    messages: number
    internalNotes: number
  }
}

export interface ConversationParticipant {
  id: string
  conversationId: string
  contactId: string
  role: 'sender' | 'recipient' | 'cc' | 'bcc' | 'participant'
  channelId: string | null
  contact?: Contact
}

export interface InboxMessage {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound' | 'internal'
  channel: ChannelType
  subject: string | null
  body: string | null
  bodyHtml: string | null
  attachments: string // JSON
  metadata: string // JSON
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  deliveredAt: string | null
  readAt: string | null
  aiDraft: boolean
  aiContextUsed: string // JSON
  senderName: string | null
  senderEmail: string | null
  externalId: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface InternalNote {
  id: string
  conversationId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface ConversationEvent {
  id: string
  conversationId: string
  type: string
  userId: string | null
  metadata: string // JSON
  createdAt: string
}

// ─── Composite Types ──────────────────────────────────────────────────────────

export interface ConversationWithDetails extends Conversation {
  messages: InboxMessage[]
  participants: ConversationParticipant[]
  internalNotes: InternalNote[]
  events: ConversationEvent[]
}

// ─── Filter & Query Types ─────────────────────────────────────────────────────

export interface ConversationFilters {
  status?: string
  channel?: string
  assignedTo?: string
  search?: string
  tags?: string[]
  cursor?: string
  limit?: number
  isStarred?: boolean
  priority?: string
  focusInbox?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

// ─── Mutation Param Types ─────────────────────────────────────────────────────

export interface CreateConversationParams {
  channel: ChannelType
  subject?: string
  priority?: string
  body: string
  to: string
  toName?: string
  fromEmail?: string
  projectId?: string
  tags?: string[]
}

export interface UpdateConversationParams {
  status?: string
  priority?: string
  assignedToId?: string | null
  tags?: string[]
  isStarred?: boolean
  projectId?: string | null
}

export interface SendMessageParams {
  body: string
  subject?: string
  replyToMessageId?: string
}

export interface AIReplyResult {
  draft: string
  contextUsed: {
    messageCount: number
    conversationSubject: string
    channel: string
    tone: string
  }
}

export type AITone = 'pro' | 'friendly' | 'formal'

// ─── Presence Types ───────────────────────────────────────────────────────────

export interface PresenceUser {
  id: string
  name: string
  avatar: string | null
  status: 'viewing' | 'typing' | 'idle'
}

// ─── Attachment Type ──────────────────────────────────────────────────────────

export interface Attachment {
  name: string
  url: string
  mimeType: string
  size: number
}
