'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, LayoutGrid, Settings2, BarChart3 } from 'lucide-react'
import { ContactDataGrid } from './components/contact-data-grid'
import { ContactProfile } from './components/contact-profile'
import { KanbanBoard } from './components/kanban-board'
import { PipelineManager } from './components/pipeline-manager'

// ─── Query Client ───────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
    },
  },
})

// ─── Main CRM Panel ─────────────────────────────────────────────────────────

function CrmPanelInner() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {selectedContactId ? (
        <ContactProfile
          contactId={selectedContactId}
          onBack={() => setSelectedContactId(null)}
        />
      ) : (
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="contacts" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Users className="w-4 h-4 mr-1.5" /> Contacts
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <LayoutGrid className="w-4 h-4 mr-1.5" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Settings2 className="w-4 h-4 mr-1.5" /> Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4">
            <ContactDataGrid onSelectContact={setSelectedContactId} />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            <KanbanBoard />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <PipelineManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ─── Export with QueryClientProvider ─────────────────────────────────────────

export function CrmPanel() {
  return (
    <QueryClientProvider client={queryClient}>
      <CrmPanelInner />
    </QueryClientProvider>
  )
}
