'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query'
import type {
  Conversation,
  ConversationWithDetails,
  ConversationFilters,
  PaginatedResult,
  CreateConversationParams,
  UpdateConversationParams,
  SendMessageParams,
  AIReplyResult,
  AITone,
  ChannelAccount,
  Contact,
} from '../types'

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const inboxKeys = {
  all: ['inbox'] as const,
  conversations: () => ['inbox', 'conversations'] as const,
  conversationsFiltered: (filters: ConversationFilters) =>
    ['inbox', 'conversations', filters] as const,
  conversation: (id: string) => ['inbox', 'conversation', id] as const,
  messages: (id: string) => ['inbox', 'conversation', id, 'messages'] as const,
  contacts: () => ['inbox', 'contacts'] as const,
  contactsSearch: (search: string) =>
    ['inbox', 'contacts', search] as const,
  channels: () => ['inbox', 'channels'] as const,
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

/** Fetch paginated conversations with filters (infinite scroll support) */
export function useConversations(filters: ConversationFilters = {}) {
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: inboxKeys.conversationsFiltered(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.channel) params.set('channel', filters.channel)
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
      if (filters.search) params.set('search', filters.search)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.isStarred) params.set('isStarred', 'true')
      if (filters.focusInbox) params.set('focusInbox', 'true')
      if (pageParam) params.set('cursor', pageParam as string)
      params.set('limit', String(filters.limit ?? 25))

      const res = await fetch(`/api/inbox/conversations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch conversations')
      return res.json() as Promise<PaginatedResult<Conversation>>
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 30_000,
  })
}

/** Fetch a single conversation with full details */
export function useConversation(id: string | null) {
  return useQuery({
    queryKey: inboxKeys.conversation(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/inbox/conversations/${id}`)
      if (!res.ok) throw new Error('Failed to fetch conversation')
      return res.json() as Promise<ConversationWithDetails>
    },
    enabled: !!id,
    staleTime: 15_000,
  })
}

/** Fetch messages for a conversation (if loaded separately) */
export function useConversationMessages(id: string | null) {
  return useQuery({
    queryKey: inboxKeys.messages(id ?? ''),
    queryFn: async () => {
      if (!id) return []
      const res = await fetch(`/api/inbox/conversations/${id}/messages`)
      if (!res.ok) throw new Error('Failed to fetch messages')
      return res.json()
    },
    enabled: !!id,
    staleTime: 15_000,
  })
}

/** Search contacts */
export function useInboxContacts(search?: string) {
  return useQuery({
    queryKey: search ? inboxKeys.contactsSearch(search) : inboxKeys.contacts(),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/inbox/contacts?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch contacts')
      const json = await res.json()
      // API returns { data: [...] }
      return (json.data ?? json) as Contact[]
    },
    staleTime: 60_000,
  })
}

/** Fetch connected channel accounts */
export function useChannelAccounts() {
  return useQuery({
    queryKey: inboxKeys.channels(),
    queryFn: async () => {
      const res = await fetch('/api/inbox/channels')
      if (!res.ok) throw new Error('Failed to fetch channel accounts')
      const json = await res.json()
      // API returns { data: [...] }
      return (json.data ?? json) as ChannelAccount[]
    },
    staleTime: 60_000,
  })
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

/** Create a new conversation */
export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateConversationParams) => {
      const res = await fetch('/api/inbox/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to create conversation')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations() })
    },
  })
}

/** Update a conversation (status, priority, assignment, etc.) */
export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateConversationParams
    }) => {
      const res = await fetch(`/api/inbox/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to update conversation')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations() })
      queryClient.invalidateQueries({
        queryKey: inboxKeys.conversation(variables.id),
      })
    },
  })
}

/** Send a message in a conversation */
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      data,
    }: {
      conversationId: string
      data: SendMessageParams
    }) => {
      const res = await fetch(
        `/api/inbox/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to send message')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations() })
      queryClient.invalidateQueries({
        queryKey: inboxKeys.conversation(variables.conversationId),
      })
    },
  })
}

/** Add an internal note to a conversation */
export function useAddInternalNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string
      content: string
    }) => {
      const res = await fetch(
        `/api/inbox/conversations/${conversationId}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      )
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to add note')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: inboxKeys.conversation(variables.conversationId),
      })
    },
  })
}

/** Assign a conversation to a user */
export function useAssignConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      assignedToId,
    }: {
      conversationId: string
      assignedToId: string
    }) => {
      const res = await fetch(
        `/api/inbox/conversations/${conversationId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedToId }),
        },
      )
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to assign conversation')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations() })
      queryClient.invalidateQueries({
        queryKey: inboxKeys.conversation(variables.conversationId),
      })
    },
  })
}

/** Generate an AI reply for a conversation */
export function useGenerateAIReply() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      tone,
    }: {
      conversationId: string
      tone: AITone
    }): Promise<AIReplyResult> => {
      const res = await fetch(
        `/api/inbox/conversations/${conversationId}/ai-reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tone }),
        },
      )
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to generate AI reply')
      }
      return res.json()
    },
  })
}

/** Sync a channel account (fetch new messages) */
export function useSyncChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const res = await fetch(`/api/inbox/channels/${channelId}/sync`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to sync channel')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations() })
      queryClient.invalidateQueries({ queryKey: inboxKeys.channels() })
    },
  })
}
