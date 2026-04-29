'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Star,
  AlertCircle,
  ChevronDown,
  Inbox,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChannelBadge } from './channel-badge'
import type { Conversation, ConversationFilters } from '../types'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  filters: ConversationFilters
}

const priorityColors: Record<string, string> = {
  urgent: 'text-red-400',
  high: 'text-amber-400',
  normal: '',
  low: 'text-zinc-600',
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  filters,
}: ConversationListProps) {
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      // Sort by unread first, then by lastActivityAt
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1
      return (
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime()
      )
    })
  }, [conversations])

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <ConversationCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedConversations.length === 0 ? (
          <EmptyState filters={filters} />
        ) : (
          <div className="p-2 space-y-0.5">
            <AnimatePresence initial={false}>
              {sortedConversations.map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conversation={conv}
                  isSelected={conv.id === selectedId}
                  onClick={() => onSelect(conv.id)}
                />
              ))}
            </AnimatePresence>

            {hasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={onLoadMore}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                  Charger plus
                </button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ─── Conversation Card ────────────────────────────────────────────────────────

function ConversationCard({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const lastMessage = conversation.messages?.[0]
  const participant = conversation.participants?.find(
    (p) => p.role === 'sender' || p.role === 'participant',
  )
  const senderName = participant?.contact?.name ?? lastMessage?.senderName ?? 'Inconnu'
  const snippet = lastMessage?.body?.substring(0, 80) ?? ''
  const tags: string[] = (() => {
    try {
      return JSON.parse(conversation.tags)
    } catch {
      return []
    }
  })()

  const initials = senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const timeAgo = formatDistanceToNow(new Date(conversation.lastActivityAt), {
    addSuffix: false,
    locale: fr,
  })

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors group ${
        isSelected
          ? 'bg-emerald-500/10 border border-emerald-500/20'
          : 'hover:bg-zinc-800/60 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-9 h-9 border border-zinc-700">
            <AvatarImage
              src={participant?.contact?.avatar ?? undefined}
              alt={senderName}
            />
            <AvatarFallback className="text-xs bg-zinc-800 text-zinc-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          {conversation.unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-[9px] text-white font-bold flex items-center justify-center">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: name + time + badges */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`text-sm font-medium truncate flex-1 ${
                conversation.unreadCount > 0 ? 'text-zinc-100' : 'text-zinc-300'
              }`}
            >
              {senderName}
            </span>
            <span className="text-[10px] text-zinc-500 flex-shrink-0">
              {timeAgo}
            </span>
          </div>

          {/* Subject */}
          {conversation.subject && (
            <p
              className={`text-xs truncate mb-0.5 ${
                conversation.unreadCount > 0
                  ? 'text-zinc-200 font-medium'
                  : 'text-zinc-400'
              }`}
            >
              {conversation.subject}
            </p>
          )}

          {/* Snippet */}
          <p className="text-[11px] text-zinc-500 truncate leading-tight">
            {snippet || 'Aucun aperçu'}
          </p>

          {/* Bottom row: badges */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <ChannelBadge channel={conversation.channel} size="sm" />
            {conversation.priority === 'urgent' && (
              <AlertCircle className="w-3 h-3 text-red-400" />
            )}
            {conversation.isStarred && (
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            )}
            {tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-4 px-1 text-[8px] bg-zinc-800/50 border-zinc-700 text-zinc-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConversationCardSkeleton() {
  return (
    <div className="p-3 rounded-lg">
      <div className="flex items-start gap-2.5">
        <Skeleton className="w-9 h-9 rounded-full bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4 bg-zinc-800" />
          <Skeleton className="h-3 w-1/2 bg-zinc-800" />
          <Skeleton className="h-2.5 w-full bg-zinc-800" />
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-8 bg-zinc-800" />
            <Skeleton className="h-4 w-12 bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filters }: { filters: ConversationFilters }) {
  const hasActiveFilters =
    filters.channel || filters.status || filters.priority || filters.isStarred

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-300 mb-1">
        {hasActiveFilters
          ? 'Aucune conversation trouvée'
          : 'Boîte de réception vide'}
      </p>
      <p className="text-xs text-zinc-500 text-center">
        {hasActiveFilters
          ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
          : 'Les nouvelles conversations apparaîtront ici quand vous connecterez un canal.'}
      </p>
    </div>
  )
}
