'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { UnifiedInboxLayout } from './components/unified-inbox-layout'

/**
 * Main export component for the Unified Inbox tab panel.
 * Wraps the layout with TanStack Query provider.
 * This is the component used in the tabComponents map under the 'inbox' key.
 */
export function UnifiedInboxPanel() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <UnifiedInboxLayout />
    </QueryClientProvider>
  )
}
