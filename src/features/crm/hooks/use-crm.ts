'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CrmContact {
  id: string
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  jobTitle: string | null
  avatar: string | null
  tags: string
  source: string
  status: string
  lifecycle: string
  score: number
  lastActivityAt: string | null
  teamId: string | null
  createdAt: string
  updatedAt: string
  deals?: any[]
  _count?: { activities: number; notes: number; deals: number }
}

interface Pipeline {
  id: string
  name: string
  description: string | null
  stages: string // JSON
  isDefault: boolean
  teamId: string | null
  userId: string
  createdAt: string
  updatedAt: string
  _count?: { deals: number }
}

interface Deal {
  id: string
  pipelineId: string
  stageId: string
  title: string
  description: string | null
  value: number
  currency: string
  probability: number
  expectedCloseDate: string | null
  actualCloseDate: string | null
  status: string
  lossReason: string | null
  contactId: string | null
  assignedToId: string | null
  teamId: string | null
  createdAt: string
  updatedAt: string
  pipeline?: Pipeline
  contact?: { id: string; firstName: string | null; lastName: string; company: string | null; avatar: string | null }
  assignedTo?: { id: string; name: string | null; avatar: string | null }
  activities?: any[]
}

interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  total: number
}

// ─── Contact Hooks ──────────────────────────────────────────────────────────

export function useContacts(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: ['crm', 'contacts', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const res = await fetch(`/api/crm/contacts?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur chargement contacts')
      return res.json() as Promise<PaginatedResult<CrmContact>>
    },
  })
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: ['crm', 'contacts', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/crm/contacts/${id}`)
      if (!res.ok) throw new Error('Erreur chargement contact')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur création contact')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] })
      toast.success('Contact créé avec succès')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur mise à jour contact')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts', variables.id] })
      toast.success('Contact mis à jour')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/contacts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur suppression contact')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] })
      toast.success('Contact supprimé')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useImportContacts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ data, teamId, mapping }: { data: string; teamId?: string; mapping?: Record<string, string> }) => {
      const res = await fetch('/api/crm/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, teamId, mapping }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur import CSV')
      }
      return res.json() as Promise<{ imported: number; skipped: number; errors: string[] }>
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] })
      toast.success(`${result.imported} contacts importés${result.skipped ? ` (${result.skipped} ignorés)` : ''}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Contact Notes ──────────────────────────────────────────────────────────

export function useContactNotes(contactId: string | null) {
  return useQuery({
    queryKey: ['crm', 'contacts', contactId, 'notes'],
    queryFn: async () => {
      if (!contactId) return []
      const res = await fetch(`/api/crm/contacts/${contactId}/notes`)
      if (!res.ok) throw new Error('Erreur chargement notes')
      return res.json()
    },
    enabled: !!contactId,
  })
}

export function useAddNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contactId, content, isPinned }: { contactId: string; content: string; isPinned?: boolean }) => {
      const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, isPinned }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur ajout note')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts', variables.contactId, 'notes'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts', variables.contactId] })
      toast.success('Note ajoutée')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Pipeline Hooks ─────────────────────────────────────────────────────────

export function usePipelines(teamId?: string) {
  return useQuery({
    queryKey: ['crm', 'pipelines', teamId],
    queryFn: async () => {
      const params = teamId ? `?teamId=${teamId}` : ''
      const res = await fetch(`/api/crm/pipelines${params}`)
      if (!res.ok) throw new Error('Erreur chargement pipelines')
      return res.json() as Promise<Pipeline[]>
    },
  })
}

export function usePipelineStats(pipelineId: string | null) {
  return useQuery({
    queryKey: ['crm', 'pipelines', pipelineId, 'stats'],
    queryFn: async () => {
      if (!pipelineId) return null
      const res = await fetch(`/api/crm/pipelines/${pipelineId}?stats=true`)
      if (!res.ok) throw new Error('Erreur chargement stats pipeline')
      return res.json()
    },
    enabled: !!pipelineId,
  })
}

export function useCreatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/crm/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur création pipeline')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] })
      toast.success('Pipeline créé')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/crm/pipelines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur mise à jour pipeline')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] })
      toast.success('Pipeline mis à jour')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/pipelines/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur suppression pipeline')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] })
      toast.success('Pipeline supprimé')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Deal Hooks ─────────────────────────────────────────────────────────────

export function useDeals(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: ['crm', 'deals', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const res = await fetch(`/api/crm/deals?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur chargement affaires')
      return res.json() as Promise<PaginatedResult<Deal>>
    },
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur création affaire')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] })
      toast.success('Affaire créée')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur déplacement affaire')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] })
    },
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/crm/deals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur mise à jour affaire')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] })
      toast.success('Affaire mise à jour')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/deals/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur suppression affaire')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'deals'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] })
      toast.success('Affaire supprimée')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
