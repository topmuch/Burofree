/**
 * Zod validation schemas for the Unified Inbox API routes.
 * All inputs are validated before processing.
 */
import { z } from 'zod'

// ─── Channel Types ────────────────────────────────────────────────────────────

export const channelTypeSchema = z.enum(['email', 'whatsapp', 'sms', 'slack'])
export const providerTypeSchema = z.enum(['gmail', 'outlook', 'whatsapp', 'twilio', 'slack'])

// ─── Conversation Schemas ─────────────────────────────────────────────────────

export const conversationStatusSchema = z.enum(['open', 'pending', 'closed', 'spam'])
export const conversationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])

export const listConversationsQuerySchema = z.object({
  /** Cursor for pagination (conversation ID) */
  cursor: z.string().optional(),
  /** Number of items per page */
  limit: z.coerce.number().int().min(1).max(100).default(25),
  /** Filter by status */
  status: conversationStatusSchema.optional(),
  /** Filter by channel */
  channel: channelTypeSchema.optional(),
  /** Filter by assigned user ID */
  assignedTo: z.string().optional(),
  /** Full-text search query */
  search: z.string().optional(),
  /** Filter by tags (JSON string of string[]) */
  tags: z.string().optional(),
  /** Filter by priority */
  priority: conversationPrioritySchema.optional(),
  /** Filter by starred status */
  isStarred: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  /** Focus Inbox mode (show only unread + starred + high priority) */
  focusInbox: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
})

export const createConversationSchema = z.object({
  /** Channel type */
  channel: channelTypeSchema.default('email'),
  /** Subject line */
  subject: z.string().min(1).max(500).optional(),
  /** Priority level */
  priority: conversationPrioritySchema.default('normal'),
  /** Initial message body */
  body: z.string().min(1).max(50000),
  /** Recipient identifier (email, phone, slack ID) */
  to: z.string().min(1).max(500),
  /** Recipient name */
  toName: z.string().max(200).optional(),
  /** Sender email (for outbound via specific channel account) */
  fromEmail: z.string().email().optional(),
  /** Optional project linkage */
  projectId: z.string().optional(),
  /** Tags */
  tags: z.array(z.string()).max(20).optional(),
})

export const updateConversationSchema = z.object({
  status: conversationStatusSchema.optional(),
  priority: conversationPrioritySchema.optional(),
  assignedToId: z.string().nullable().optional(),
  tags: z.array(z.string()).max(20).optional(),
  isStarred: z.boolean().optional(),
  projectId: z.string().nullable().optional(),
})

// ─── Message Schemas ──────────────────────────────────────────────────────────

export const messageDirectionSchema = z.enum(['inbound', 'outbound', 'internal'])
export const messageStatusSchema = z.enum(['pending', 'sent', 'delivered', 'read', 'failed'])

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  direction: messageDirectionSchema.optional(),
})

export const sendMessageSchema = z.object({
  /** Message body */
  body: z.string().min(1).max(50000),
  /** Subject (for email channels, overrides conversation subject) */
  subject: z.string().max(500).optional(),
  /** Reply-to message ID */
  replyToMessageId: z.string().optional(),
})

// ─── Internal Note Schemas ────────────────────────────────────────────────────

export const listNotesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const addInternalNoteSchema = z.object({
  content: z.string().min(1).max(10000),
})

// ─── Assign Schema ────────────────────────────────────────────────────────────

export const assignConversationSchema = z.object({
  assignedToId: z.string().min(1),
})

// ─── AI Reply Schema ──────────────────────────────────────────────────────────

export const aiReplyToneSchema = z.enum(['pro', 'friendly', 'formal'])

export const generateAiReplySchema = z.object({
  tone: aiReplyToneSchema.default('pro'),
})

// ─── Contact Schemas ──────────────────────────────────────────────────────────

export const listContactsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
})

export const upsertContactSchema = z.object({
  name: z.string().min(1).max(200),
  emails: z.array(z.string().email()).max(10).optional(),
  phones: z.array(z.string()).max(10).optional(),
  slackId: z.string().optional(),
  telegramId: z.string().optional(),
  preferredChannel: z.enum(['email', 'whatsapp', 'sms', 'slack']).default('email'),
  customFields: z.record(z.string(), z.string()).optional(),
  tags: z.array(z.string()).max(20).optional(),
  avatar: z.string().url().optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
})

// ─── Channel Account Schemas ──────────────────────────────────────────────────

export const connectChannelAccountSchema = z.object({
  provider: providerTypeSchema,
  email: z.string().email().optional(),
  accountId: z.string().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiry: z.string().datetime().optional(),
  scopes: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

// ─── Sync Schema ──────────────────────────────────────────────────────────────

export const syncChannelAccountSchema = z.object({
  /** Force full sync instead of incremental */
  fullSync: z.boolean().default(false),
})
