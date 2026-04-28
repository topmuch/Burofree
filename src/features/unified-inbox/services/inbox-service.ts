/**
 * Core Inbox Business Logic for the Unified Inbox.
 * Provides all business operations for conversations, messages,
 * contacts, channel accounts, and AI-powered reply generation.
 */

import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { adapterRegistry } from '../channels/registry'
import type { ProviderType, UnifiedMessage } from '../channels/types'
import { PROVIDER_CHANNEL_MAP } from '../channels/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationFilters {
  status?: string
  channel?: string
  assignedTo?: string
  search?: string
  tags?: string[]
  cursor?: string
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface CreateConversationData {
  channel: string
  subject?: string
  priority?: string
  body: string
  to: string
  toName?: string
  fromEmail?: string
  projectId?: string
  tags?: string[]
}

export interface UpdateConversationData {
  status?: string
  priority?: string
  assignedToId?: string | null
  tags?: string[]
  isStarred?: boolean
  projectId?: string | null
}

export interface SendMessageData {
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

export interface ConnectChannelData {
  provider: string
  email?: string
  accountId?: string
  accessToken: string
  refreshToken?: string
  tokenExpiry?: string
  scopes?: string[]
  config?: Record<string, unknown>
}

export interface UpsertContactData {
  name: string
  emails?: string[]
  phones?: string[]
  slackId?: string
  telegramId?: string
  preferredChannel?: string
  customFields?: Record<string, string>
  tags?: string[]
  avatar?: string
  company?: string
  notes?: string
}

// ─── Conversations ────────────────────────────────────────────────────────────

/**
 * Get paginated list of conversations with filters.
 * Supports cursor-based pagination and full-text search.
 */
export async function getConversations(
  userId: string,
  filters: ConversationFilters,
): Promise<PaginatedResult<{ id: string; [key: string]: unknown }>> {
  const { status, channel, assignedTo, search, tags, cursor, limit = 25 } = filters

  const where: Record<string, unknown> = { userId }

  if (status) where.status = status
  if (channel) where.channel = channel
  if (assignedTo) where.assignedToId = assignedTo

  if (search) {
    where.OR = [
      { subject: { contains: search } },
      { messages: { some: { body: { contains: search } } } },
      { messages: { some: { senderName: { contains: search } } } },
    ]
  }

  if (tags && tags.length > 0) {
    // SQLite: check if any tag in the JSON array matches
    // We use a simple approach since SQLite doesn't have JSON contains
    where.AND = tags.map((tag) => ({
      tags: { contains: tag },
    }))
  }

  if (cursor) {
    where.id = { lt: cursor }
  }

  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastActivityAt: 'desc' },
    take: limit + 1,
    include: {
      participants: { include: { contact: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true, internalNotes: true } },
    },
  })

  const hasMore = conversations.length > limit
  const data = hasMore ? conversations.slice(0, limit) : conversations
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, nextCursor, hasMore }
}

/**
 * Get a single conversation with messages, participants, and notes.
 */
export async function getConversation(userId: string, conversationId: string) {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      participants: { include: { contact: true } },
      internalNotes: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!conversation) return null
  return conversation
}

/**
 * Create a new conversation with initial message and participants.
 * Also creates or updates the contact.
 */
export async function createConversation(userId: string, data: CreateConversationData) {
  // Upsert contact based on the "to" identifier
  const contactEmail = data.to.includes('@') ? data.to : undefined
  const contact = await upsertContact(userId, {
    name: data.toName ?? data.to,
    emails: contactEmail ? [contactEmail] : [],
    phones: !contactEmail ? [data.to] : [],
  })

  // Create conversation + initial message + participant in a transaction
  const result = await db.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        userId,
        channel: data.channel,
        subject: data.subject,
        priority: data.priority ?? 'normal',
        tags: JSON.stringify(data.tags ?? []),
        metadata: JSON.stringify({ fromEmail: data.fromEmail }),
        projectId: data.projectId,
        lastActivityAt: new Date(),
      },
    })

    // Create initial message
    const message = await tx.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        direction: 'outbound',
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        status: 'pending',
        senderEmail: data.fromEmail,
        metadata: JSON.stringify({ to: data.to }),
      },
    })

    // Create participant link
    await tx.conversationParticipant.create({
      data: {
        conversationId: conversation.id,
        contactId: contact.id,
        role: 'recipient',
        channelId: data.to,
      },
    })

    // Create event
    await tx.conversationEvent.create({
      data: {
        conversationId: conversation.id,
        type: 'created',
        userId,
        metadata: JSON.stringify({ channel: data.channel, initialMessage: true }),
      },
    })

    return { conversation, message, contact }
  })

  return result
}

/**
 * Update a conversation's status, priority, assignment, tags, or star status.
 */
export async function updateConversation(
  userId: string,
  conversationId: string,
  data: UpdateConversationData,
) {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId },
  })
  if (!conversation) return null

  const updateData: Record<string, unknown> = {}
  const events: Array<{ type: string; metadata: Record<string, unknown> }> = []

  if (data.status !== undefined && data.status !== conversation.status) {
    updateData.status = data.status
    events.push({ type: 'status_changed', metadata: { from: conversation.status, to: data.status } })
  }

  if (data.priority !== undefined && data.priority !== conversation.priority) {
    updateData.priority = data.priority
    events.push({ type: 'priority_changed', metadata: { from: conversation.priority, to: data.priority } })
  }

  if (data.assignedToId !== undefined) {
    updateData.assignedToId = data.assignedToId
    events.push({ type: 'assigned', metadata: { assignedToId: data.assignedToId } })
  }

  if (data.tags !== undefined) {
    updateData.tags = JSON.stringify(data.tags)
  }

  if (data.isStarred !== undefined) {
    updateData.isStarred = data.isStarred
  }

  if (data.projectId !== undefined) {
    updateData.projectId = data.projectId
  }

  const updated = await db.$transaction(async (tx) => {
    const conv = await tx.conversation.update({
      where: { id: conversationId },
      data: updateData,
    })

    for (const event of events) {
      await tx.conversationEvent.create({
        data: {
          conversationId,
          type: event.type,
          userId,
          metadata: JSON.stringify(event.metadata),
        },
      })
    }

    return conv
  })

  return updated
}

/**
 * Send an outbound message in a conversation via the channel adapter.
 */
export async function sendMessage(
  userId: string,
  conversationId: string,
  data: SendMessageData,
) {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { participants: true },
  })
  if (!conversation) return null

  // Determine the channel account and provider
  const provider = getProviderForChannel(conversation.channel)
  const recipient = conversation.participants.find((p) => p.role === 'recipient' || p.role === 'sender')

  let externalId: string | null = null
  let externalThreadId: string | null = conversation.externalThreadId

  // Try to send via adapter if provider is available
  try {
    const adapter = await adapterRegistry.getAdapter(userId, provider as ProviderType)
    const sent = await adapter.sendMessage({
      to: recipient?.channelId ?? '',
      subject: data.subject ?? conversation.subject ?? undefined,
      body: data.body,
      replyToMessageId: data.replyToMessageId,
    })
    externalId = sent.externalId
    externalThreadId = sent.externalThreadId
  } catch {
    // If adapter is not available (e.g., not connected), store message as pending
    // The message will be sent when the channel is reconnected
  }

  // Create message record
  const message = await db.$transaction(async (tx) => {
    const msg = await tx.inboxMessage.create({
      data: {
        conversationId,
        userId,
        direction: 'outbound',
        channel: conversation.channel,
        subject: data.subject,
        body: data.body,
        status: externalId ? 'sent' : 'pending',
        externalId,
        senderEmail: '',
        metadata: JSON.stringify({ externalThreadId }),
      },
    })

    // Update conversation activity
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date() },
    })

    // Create event
    await tx.conversationEvent.create({
      data: {
        conversationId,
        type: 'message_sent',
        userId,
        metadata: JSON.stringify({ messageId: msg.id, channel: conversation.channel }),
      },
    })

    return msg
  })

  return message
}

/**
 * Add an internal note to a conversation.
 */
export async function addInternalNote(
  userId: string,
  conversationId: string,
  content: string,
) {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId },
  })
  if (!conversation) return null

  const result = await db.$transaction(async (tx) => {
    const note = await tx.internalNote.create({
      data: { conversationId, userId, content },
    })

    await tx.conversationEvent.create({
      data: {
        conversationId,
        type: 'note_added',
        userId,
        metadata: JSON.stringify({ noteId: note.id }),
      },
    })

    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date() },
    })

    return note
  })

  return result
}

/**
 * Assign a conversation to a user.
 */
export async function assignConversation(
  userId: string,
  conversationId: string,
  assignedToId: string,
) {
  return updateConversation(userId, conversationId, { assignedToId })
}

/**
 * Full-text search across conversations (subject + message body + sender).
 */
export async function searchConversations(userId: string, query: string) {
  const results = await db.conversation.findMany({
    where: {
      userId,
      OR: [
        { subject: { contains: query } },
        { messages: { some: { body: { contains: query } } } },
        { messages: { some: { senderName: { contains: query } } } },
        { messages: { some: { senderEmail: { contains: query } } } },
      ],
    },
    orderBy: { lastActivityAt: 'desc' },
    take: 50,
    include: {
      participants: { include: { contact: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  return results
}

/**
 * Sync a channel account — fetch new messages from the provider
 * and upsert them as conversations.
 */
export async function syncChannelAccount(userId: string, channelId: string) {
  const account = await db.channelAccount.findFirst({
    where: { id: channelId, userId, isActive: true },
  })
  if (!account) return null

  const provider = account.provider as ProviderType

  try {
    const adapter = await adapterRegistry.getAdapter(userId, provider)
    const { messages, cursor } = await adapter.fetchIncremental(account.lastSyncCursor)

    // Process each message and upsert into conversations
    for (const msg of messages) {
      await upsertMessageFromSync(userId, account.id, msg)
    }

    // Update sync cursor
    await db.channelAccount.update({
      where: { id: channelId },
      data: { lastSyncCursor: cursor, lastSyncAt: new Date(), lastError: null },
    })

    return { syncedCount: messages.length, cursor }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown sync error'
    await db.channelAccount.update({
      where: { id: channelId },
      data: { lastError: errorMsg },
    })
    throw error
  }
}

/**
 * Generate an AI reply using conversation context and z-ai-web-dev-sdk.
 * Supports tone adjustment: pro, friendly, formal.
 */
export async function generateAIReply(
  userId: string,
  conversationId: string,
  tone: 'pro' | 'friendly' | 'formal',
): Promise<AIReplyResult> {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!conversation || conversation.messages.length === 0) {
    throw new Error('Conversation not found or has no messages')
  }

  // Build context from recent messages
  const recentMessages = [...conversation.messages].reverse()
  const contextLines = recentMessages.map((msg) => {
    const sender = msg.direction === 'inbound'
      ? (msg.senderName || msg.senderEmail || 'Client')
      : 'You'
    return `${sender}: ${msg.body?.substring(0, 500) ?? ''}`
  })

  const toneInstructions: Record<string, string> = {
    pro: 'Rédige une réponse professionnelle et concise. Utilise un ton neutre et factuel.',
    friendly: 'Rédige une réponse chaleureuse et amicale. Sois approachable tout en restant professionnel.',
    formal: 'Rédige une réponse formelle et polie. Utilise le vouvoiement et un langage soutenu.',
  }

  const systemPrompt = `Tu es l'assistant Burofree AI. Tu aides à rédiger des réponses pour la messagerie unifiée.
${toneInstructions[tone] ?? toneInstructions.pro}
Répond uniquement avec le texte du brouillon, sans explications supplémentaires.
Limite la réponse à 400 mots maximum.`

  const userPrompt = `Contexte de la conversation (sujet: ${conversation.subject ?? 'Sans sujet'}, canal: ${conversation.channel}):
---
${contextLines.join('\n')}
---
Rédige une réponse appropriée pour le dernier message.`

  // Use z-ai-web-dev-sdk
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  })

  const draft = completion.choices?.[0]?.message?.content ?? ''

  return {
    draft,
    contextUsed: {
      messageCount: recentMessages.length,
      conversationSubject: conversation.subject ?? '',
      channel: conversation.channel,
      tone,
    },
  }
}

// ─── Channel Accounts ─────────────────────────────────────────────────────────

/**
 * Get all channel accounts for a user.
 */
export async function getChannelAccounts(userId: string) {
  return db.channelAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      email: true,
      accountId: true,
      isActive: true,
      lastSyncAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Connect a new channel account with encrypted OAuth tokens.
 */
export async function connectChannelAccount(userId: string, data: ConnectChannelData) {
  const provider = data.provider as ProviderType

  const encryptedAccessToken = encrypt(data.accessToken)
  const encryptedRefreshToken = data.refreshToken ? encrypt(data.refreshToken) : null

  return db.channelAccount.upsert({
    where: {
      userId_provider: { userId, provider },
    },
    create: {
      userId,
      provider,
      email: data.email,
      accountId: data.accountId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiry: data.tokenExpiry ? new Date(data.tokenExpiry) : null,
      scopes: JSON.stringify(data.scopes ?? []),
      config: JSON.stringify(data.config ?? {}),
      isActive: true,
    },
    update: {
      email: data.email,
      accountId: data.accountId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiry: data.tokenExpiry ? new Date(data.tokenExpiry) : null,
      scopes: JSON.stringify(data.scopes ?? []),
      config: JSON.stringify(data.config ?? {}),
      isActive: true,
      lastError: null,
    },
  })
}

/**
 * Disconnect (deactivate) a channel account.
 */
export async function disconnectChannelAccount(userId: string, channelId: string) {
  const account = await db.channelAccount.findFirst({
    where: { id: channelId, userId },
  })
  if (!account) return null

  // Disconnect the adapter from registry
  try {
    await adapterRegistry.disconnectAdapter(userId, account.provider as ProviderType)
  } catch {
    // Ignore errors if adapter wasn't connected
  }

  // Deactivate the account
  return db.channelAccount.update({
    where: { id: channelId },
    data: { isActive: false },
  })
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

/**
 * Get contacts with optional search.
 */
export async function getContacts(userId: string, search?: string) {
  const where: Record<string, unknown> = { userId }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { emails: { contains: search } },
      { company: { contains: search } },
    ]
  }

  return db.contact.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 100,
  })
}

/**
 * Create or update a contact by email match.
 */
export async function upsertContact(userId: string, data: UpsertContactData) {
  // Try to find existing contact by email
  let existingContact: Awaited<ReturnType<typeof db.contact.findFirst>> | null = null
  if (data.emails && data.emails.length > 0) {
    for (const email of data.emails) {
      const found = await db.contact.findFirst({
        where: { userId, emails: { contains: email } },
      })
      if (found) {
        existingContact = found
        break
      }
    }
  }

  if (existingContact) {
    // Merge data into existing contact
    const existingEmails: string[] = JSON.parse(existingContact.emails)
    const existingPhones: string[] = JSON.parse(existingContact.phones)
    const existingTags: string[] = JSON.parse(existingContact.tags)
    const existingCustomFields: Record<string, string> = JSON.parse(existingContact.customFields)

    const mergedEmails = [...new Set([...existingEmails, ...(data.emails ?? [])])]
    const mergedPhones = [...new Set([...existingPhones, ...(data.phones ?? [])])]
    const mergedTags = [...new Set([...existingTags, ...(data.tags ?? [])])]
    const mergedCustomFields = { ...existingCustomFields, ...(data.customFields ?? {}) }

    return db.contact.update({
      where: { id: existingContact.id },
      data: {
        name: data.name ?? existingContact.name,
        emails: JSON.stringify(mergedEmails),
        phones: JSON.stringify(mergedPhones),
        slackId: data.slackId ?? existingContact.slackId,
        telegramId: data.telegramId ?? existingContact.telegramId,
        preferredChannel: data.preferredChannel ?? existingContact.preferredChannel,
        customFields: JSON.stringify(mergedCustomFields),
        tags: JSON.stringify(mergedTags),
        avatar: data.avatar ?? existingContact.avatar,
        company: data.company ?? existingContact.company,
        notes: data.notes ?? existingContact.notes,
      },
    })
  }

  // Create new contact
  return db.contact.create({
    data: {
      userId,
      name: data.name,
      emails: JSON.stringify(data.emails ?? []),
      phones: JSON.stringify(data.phones ?? []),
      slackId: data.slackId,
      telegramId: data.telegramId,
      preferredChannel: data.preferredChannel ?? 'email',
      customFields: JSON.stringify(data.customFields ?? {}),
      tags: JSON.stringify(data.tags ?? []),
      avatar: data.avatar,
      company: data.company,
      notes: data.notes,
    },
  })
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Upsert a synced message from a channel adapter into the database.
 * Creates or finds the conversation, contact, and message.
 */
async function upsertMessageFromSync(
  userId: string,
  channelAccountId: string,
  msg: UnifiedMessage,
) {
  // Skip if we already have this message (dedup by externalId)
  const existing = await db.inboxMessage.findFirst({
    where: { externalId: msg.externalId, userId },
  })
  if (existing) return existing

  // Find or create conversation by externalThreadId
  let conversation = await db.conversation.findFirst({
    where: { externalThreadId: msg.externalThreadId, userId },
  })

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        userId,
        externalThreadId: msg.externalThreadId,
        channel: msg.channel,
        subject: msg.subject,
        tags: JSON.stringify([]),
        metadata: JSON.stringify({ channelAccountId }),
        lastActivityAt: msg.timestamp,
      },
    })
  }

  // Upsert contact for sender
  const contact = await upsertContact(userId, {
    name: msg.senderName || msg.senderEmail || 'Unknown',
    emails: msg.senderEmail ? [msg.senderEmail] : [],
  })

  // Create participant if not exists
  const existingParticipant = await db.conversationParticipant.findFirst({
    where: { conversationId: conversation.id, contactId: contact.id },
  })
  if (!existingParticipant && msg.senderEmail) {
    await db.conversationParticipant.create({
      data: {
        conversationId: conversation.id,
        contactId: contact.id,
        role: msg.direction === 'inbound' ? 'sender' : 'recipient',
        channelId: msg.senderEmail,
      },
    }).catch(() => {
      // Ignore duplicate participant errors
    })
  }

  // Create message
  const message = await db.inboxMessage.create({
    data: {
      conversationId: conversation.id,
      userId,
      direction: msg.direction,
      channel: msg.channel,
      subject: msg.subject,
      body: msg.body,
      bodyHtml: msg.bodyHtml,
      attachments: JSON.stringify(msg.attachments),
      metadata: JSON.stringify(msg.rawMetadata),
      status: 'delivered',
      deliveredAt: msg.timestamp,
      senderName: msg.senderName,
      senderEmail: msg.senderEmail,
      externalId: msg.externalId,
    },
  })

  // Update conversation activity
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastActivityAt: msg.timestamp,
      unreadCount: { increment: msg.direction === 'inbound' ? 1 : 0 },
    },
  })

  return message
}

/**
 * Determine the provider for a given channel type.
 * Returns the first matching provider for the channel.
 */
function getProviderForChannel(channel: string): string {
  const mapping: Record<string, string> = {
    email: 'gmail', // Default to gmail for email channel
    whatsapp: 'whatsapp',
    sms: 'twilio',
    slack: 'slack',
  }
  return mapping[channel] ?? 'gmail'
}
