'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { FilterSidebar } from './filter-sidebar'
import { ConversationList } from './conversation-list'
import { ThreadView } from './thread-view'
import { AIComposer } from './ai-composer'
import { ConnectAccountDialog } from './connect-account-dialog'
import {
  useConversations,
  useConversation,
  useUpdateConversation,
  useChannelAccounts,
  useSyncChannel,
} from '../hooks/use-inbox-query'
import type { ConversationFilters } from '../types'

interface UnifiedInboxLayoutProps {
  className?: string
}

export function UnifiedInboxLayout({ className = '' }: UnifiedInboxLayoutProps) {
  const [filters, setFilters] = useState<ConversationFilters>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const conversationsQuery = useConversations(filters)
  const conversationQuery = useConversation(selectedId)
  const updateConversation = useUpdateConversation()
  const channelAccountsQuery = useChannelAccounts()
  const syncChannel = useSyncChannel()

  const conversations =
    conversationsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const hasMore = conversationsQuery.hasNextPage ?? false

  // Ensure channelAccounts is always an array (defensive against API response shape changes)
  const channelAccounts = Array.isArray(channelAccountsQuery.data)
    ? channelAccountsQuery.data
    : []

  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedId(id)
      setMobileDetailOpen(true)
      // Mark as read optimistically
      const conv = conversations.find((c) => c.id === id)
      if (conv && conv.unreadCount > 0) {
        updateConversation.mutate({ id, data: { status: conv.status } })
      }
    },
    [conversations, updateConversation],
  )

  const handleToggleStar = useCallback(() => {
    if (!selectedId || !conversationQuery.data) return
    updateConversation.mutate({
      id: selectedId,
      data: { isStarred: !conversationQuery.data.isStarred },
    })
  }, [selectedId, conversationQuery.data, updateConversation])

  const handleFiltersChange = useCallback(
    (newFilters: ConversationFilters) => {
      setFilters(newFilters)
      setSelectedId(null)
    },
    [],
  )

  const handleLoadMore = useCallback(() => {
    if (conversationsQuery.hasNextPage) {
      conversationsQuery.fetchNextPage()
    }
  }, [conversationsQuery])

  const handleSyncChannel = useCallback(
    (channelId: string) => {
      syncChannel.mutate(channelId)
    },
    [syncChannel],
  )

  return (
    <div className={`h-[calc(100vh-7rem)] ${className}`}>
      {/* Desktop: 3-column resizable layout */}
      <div className="hidden md:block h-full">
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-zinc-800">
          {/* Column 1: Filter Sidebar */}
          <ResizablePanel defaultSize={18} minSize={14} maxSize={25}>
            <FilterSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              className="h-full rounded-l-lg"
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800" />

          {/* Column 2: Conversation List */}
          <ResizablePanel defaultSize={32} minSize={25} maxSize={45}>
            <div className="flex flex-col h-full bg-zinc-900/30">
              {/* List header */}
              <div className="flex items-center justify-between p-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-200">
                    Conversations
                  </h2>
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {conversations.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {channelAccounts.map((account) => (
                    <Button
                      key={account.id}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                      onClick={() => handleSyncChannel(account.id)}
                      disabled={syncChannel.isPending}
                      title={`Sync ${account.provider}`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          syncChannel.isPending ? 'animate-spin' : ''
                        }`}
                      />
                    </Button>
                  ))}
                  <ConnectAccountDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-emerald-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </ConnectAccountDialog>
                </div>
              </div>

              {/* Conversation list */}
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={handleSelectConversation}
                isLoading={conversationsQuery.isLoading}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
                filters={filters}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800" />

          {/* Column 3: Thread Detail + Composer */}
          <ResizablePanel defaultSize={50} minSize={35}>
            <div className="flex flex-col h-full bg-zinc-950/30">
              <ThreadView
                conversation={conversationQuery.data ?? null}
                isLoading={conversationQuery.isLoading}
                onToggleStar={handleToggleStar}
                className="flex-1 min-h-0"
              />
              {selectedId && (
                <AIComposer
                  conversationId={selectedId}
                  channel={conversationQuery.data?.channel ?? 'email'}
                  onSent={() => conversationQuery.refetch()}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Single column with Sheet for detail */}
      <div className="md:hidden h-full">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-200">
                Boîte unifiée
              </h2>
              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                {conversations.length}
              </span>
            </div>
            <ConnectAccountDialog>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-emerald-400"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </ConnectAccountDialog>
          </div>

          {/* Conversation list (full width) */}
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
            isLoading={conversationsQuery.isLoading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            filters={filters}
          />
        </div>

        {/* Detail Sheet */}
        <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-full p-0 bg-zinc-950 border-zinc-800"
          >
            <SheetTitle className="sr-only">
              Détail de la conversation
            </SheetTitle>
            <div className="flex flex-col h-full">
              <ThreadView
                conversation={conversationQuery.data ?? null}
                isLoading={conversationQuery.isLoading}
                onClose={() => setMobileDetailOpen(false)}
                onToggleStar={handleToggleStar}
                className="flex-1 min-h-0"
              />
              {selectedId && (
                <AIComposer
                  conversationId={selectedId}
                  channel={conversationQuery.data?.channel ?? 'email'}
                  onSent={() => conversationQuery.refetch()}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
