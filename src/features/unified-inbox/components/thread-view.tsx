'use client'

import { useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft,
  Star,
  MoreHorizontal,
  Paperclip,
  Clock,
  Sparkles,
  StickyNote,
  ChevronDown,
  MessageSquare,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChannelBadge } from './channel-badge'
import { PresenceBadge } from './presence-badge'
import type { ConversationWithDetails, InboxMessage, InternalNote, Attachment, PresenceUser } from '../types'

interface ThreadViewProps {
  conversation: ConversationWithDetails | null
  isLoading?: boolean
  onClose?: () => void
  onToggleStar?: () => void
  presenceUsers?: PresenceUser[]
  className?: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ThreadView({
  conversation,
  isLoading = false,
  onClose,
  onToggleStar,
  presenceUsers = [],
  className = '',
}: ThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && conversation?.messages?.length) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [conversation?.messages?.length])

  if (!conversation && !isLoading) {
    return <ThreadViewEmpty className={className} />
  }

  if (isLoading) {
    return <ThreadViewSkeleton className={className} />
  }

  if (!conversation) return null

  const participant = conversation.participants?.find(
    (p) => p.role === 'sender' || p.role === 'participant',
  )
  const senderName = participant?.contact?.name ?? 'Inconnu'
  const tags: string[] = (() => {
    try {
      return JSON.parse(conversation.tags)
    } catch {
      return []
    }
  })()

  // Group messages by day
  const groupedMessages = groupMessagesByDay(
    conversation.messages ?? [],
    conversation.internalNotes ?? [],
  )

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3 p-3">
          {/* Mobile back button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-7 w-7 text-zinc-400 hover:text-zinc-200"
              onClick={onClose}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {/* Contact info */}
          <Avatar className="w-9 h-9 border border-zinc-700">
            <AvatarImage
              src={participant?.contact?.avatar ?? undefined}
            />
            <AvatarFallback className="text-xs bg-zinc-800 text-zinc-300">
              {senderName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 truncate">
                {senderName}
              </h3>
              <ChannelBadge channel={conversation.channel} size="sm" />
              {conversation.priority === 'urgent' && (
                <Badge className="h-4 px-1 text-[8px] bg-red-500/15 text-red-400 border-red-500/25">
                  Urgent
                </Badge>
              )}
            </div>
            {conversation.subject && (
              <p className="text-xs text-zinc-400 truncate">
                {conversation.subject}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${
                conversation.isStarred
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={onToggleStar}
            >
              <Star
                className={`w-4 h-4 ${conversation.isStarred ? 'fill-amber-400' : ''}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tags row */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-5 px-1.5 text-[9px] bg-zinc-800/50 border-zinc-700 text-zinc-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Presence */}
        {presenceUsers.length > 0 && (
          <div className="px-3 pb-2">
            <PresenceBadge users={presenceUsers} />
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-1">
          {groupedMessages.map((group, idx) => (
            <div key={idx}>
              <DateDivider date={group.date} />
              <div className="space-y-3">
                {group.items.map((item) =>
                  item.type === 'message' ? (
                    <MessageBubble key={item.id} message={item.data} />
                  ) : (
                    <NoteCard key={item.id} note={item.data} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: InboxMessage }) {
  const isInbound = message.direction === 'inbound'
  const isOutbound = message.direction === 'outbound'
  const isAIDraft = message.aiDraft

  const attachments: Attachment[] = (() => {
    try {
      return JSON.parse(message.attachments)
    } catch {
      return []
    }
  })()

  const senderName = message.senderName ?? (isInbound ? 'Client' : 'Vous')
  const initials = senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const time = format(new Date(message.createdAt), 'HH:mm', { locale: fr })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isOutbound ? 'flex-row-reverse' : ''}`}
    >
      <Avatar className="w-7 h-7 flex-shrink-0 border border-zinc-700 mt-0.5">
        <AvatarFallback
          className={`text-[9px] ${
            isInbound ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400'
          }`}
        >
          {isOutbound ? 'VO' : initials}
        </AvatarFallback>
      </Avatar>

      <div
        className={`flex-1 max-w-[85%] ${isOutbound ? 'text-right' : ''}`}
      >
        {/* Sender + time */}
        <div
          className={`flex items-center gap-2 mb-1 ${
            isOutbound ? 'flex-row-reverse' : ''
          }`}
        >
          <span className="text-[11px] font-medium text-zinc-300">
            {senderName}
          </span>
          <span className="text-[10px] text-zinc-600">{time}</span>
          {isAIDraft && (
            <Badge className="h-4 px-1 text-[8px] bg-purple-500/15 text-purple-400 border-purple-500/25 gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </Badge>
          )}
          {isOutbound && (
            <DirectionBadge status={message.status} />
          )}
        </div>

        {/* Body */}
        <div
          className={`inline-block rounded-xl px-3 py-2 text-sm leading-relaxed ${
            isInbound
              ? 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
              : 'bg-emerald-500/10 text-zinc-200 border border-emerald-500/15 rounded-tr-sm'
          }`}
        >
          {message.body ?? '(Aucun contenu)'}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400"
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{att.name}</span>
                <span className="text-zinc-600">
                  ({formatFileSize(att.size)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Internal Note Card ───────────────────────────────────────────────────────

function NoteCard({ note }: { note: InternalNote }) {
  const time = format(new Date(note.createdAt), 'HH:mm', { locale: fr })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5"
    >
      <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <StickyNote className="w-3 h-3 text-amber-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-medium text-amber-400/80">
            Note interne
          </span>
          <span className="text-[10px] text-zinc-600">{time}</span>
        </div>
        <div className="rounded-xl px-3 py-2 text-sm leading-relaxed bg-amber-500/5 border border-amber-500/10 text-zinc-300 rounded-tl-sm">
          {note.content}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Date Divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: Date }) {
  const label = isToday(date)
    ? "Aujourd'hui"
    : isYesterday(date)
      ? 'Hier'
      : format(date, 'EEEE d MMMM', { locale: fr })

  return (
    <div className="flex items-center gap-3 py-3">
      <Separator className="flex-1 bg-zinc-800" />
      <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
        {label}
      </span>
      <Separator className="flex-1 bg-zinc-800" />
    </div>
  )
}

// ─── Direction Badge ──────────────────────────────────────────────────────────

function DirectionBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Envoi...', color: 'text-amber-400' },
    sent: { label: 'Envoyé', color: 'text-zinc-500' },
    delivered: { label: 'Délivré', color: 'text-emerald-400' },
    read: { label: 'Lu', color: 'text-emerald-400' },
    failed: { label: 'Échoué', color: 'text-red-400' },
  }
  const c = config[status] ?? config.delivered

  return (
    <span className={`text-[9px] ${c.color} flex items-center gap-0.5`}>
      {status === 'pending' && <Clock className="w-2.5 h-2.5" />}
      {c.label}
    </span>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function ThreadViewEmpty({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-zinc-600" />
      </div>
      <p className="text-sm font-medium text-zinc-400 mb-1">
        Sélectionnez une conversation
      </p>
      <p className="text-xs text-zinc-600 text-center max-w-[200px]">
        Choisissez une conversation dans la liste pour voir les messages
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ThreadViewSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-2.5 w-48 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-zinc-800 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-20 bg-zinc-800 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TimelineItem =
  | { type: 'message'; id: string; data: InboxMessage; date: Date }
  | { type: 'note'; id: string; data: InternalNote; date: Date }

interface DayGroup {
  date: Date
  items: TimelineItem[]
}

function groupMessagesByDay(
  messages: InboxMessage[],
  notes: InternalNote[],
): DayGroup[] {
  const items: TimelineItem[] = [
    ...messages.map((m) => ({
      type: 'message' as const,
      id: m.id,
      data: m,
      date: new Date(m.createdAt),
    })),
    ...notes.map((n) => ({
      type: 'note' as const,
      id: n.id,
      data: n,
      date: new Date(n.createdAt),
    })),
  ]

  // Sort by date ascending
  items.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Group by day
  const groups: DayGroup[] = []
  let currentGroup: DayGroup | null = null

  for (const item of items) {
    if (!currentGroup || !isSameDay(currentGroup.date, item.date)) {
      currentGroup = { date: item.date, items: [item] }
      groups.push(currentGroup)
    } else {
      currentGroup.items.push(item)
    }
  }

  return groups
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)}Mo`
}
