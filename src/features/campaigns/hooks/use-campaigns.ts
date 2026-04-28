/**
 * Custom hooks for Campaigns, Workflows, and Email Templates.
 * Uses TanStack Query for server state management.
 */
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Campaign Hooks ────────────────────────────────────────────────────────────

interface CampaignFilters {
  status?: string
  search?: string
  teamId?: string
  page?: number
  limit?: number
}

export function useCampaigns(filters: CampaignFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.teamId) params.set('teamId', filters.teamId)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))

  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: async () => {
      const res = await fetch(`/api/crm/campaigns?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')
      return res.json()
    },
  })
}

export function useCampaign(id: string | null) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await fetch(`/api/crm/campaigns/${id}`)
      if (!res.ok) throw new Error('Failed to fetch campaign')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create campaign')
      }
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }) },
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/crm/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update campaign')
      }
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign', vars.id] })
    },
  })
}

export function useSendCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action, scheduleAt, testEmail }: {
      id: string
      action: 'now' | 'schedule'
      scheduleAt?: string
      testEmail?: string
    }) => {
      const res = await fetch(`/api/crm/campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, scheduleAt, testEmail }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send campaign')
      }
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }) },
  })
}

export function useCampaignStats(id: string | null) {
  return useQuery({
    queryKey: ['campaign-stats', id],
    queryFn: async () => {
      const res = await fetch(`/api/crm/campaigns/${id}/stats`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    enabled: !!id,
  })
}

// ─── Workflow Hooks ────────────────────────────────────────────────────────────

interface WorkflowFilters {
  isActive?: boolean
  search?: string
  teamId?: string
  page?: number
  limit?: number
}

export function useWorkflows(filters: WorkflowFilters = {}) {
  const params = new URLSearchParams()
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive))
  if (filters.search) params.set('search', filters.search)
  if (filters.teamId) params.set('teamId', filters.teamId)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))

  return useQuery({
    queryKey: ['workflows', filters],
    queryFn: async () => {
      const res = await fetch(`/api/crm/workflows?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch workflows')
      return res.json()
    },
  })
}

export function useWorkflow(id: string | null) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const res = await fetch(`/api/crm/workflows/${id}`)
      if (!res.ok) throw new Error('Failed to fetch workflow')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/crm/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create workflow')
      }
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }) },
  })
}

export function useToggleWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/workflows/${id}/toggle`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to toggle workflow')
      }
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }) },
  })
}

// ─── Email Template Hooks ──────────────────────────────────────────────────────

interface TemplateFilters {
  category?: string
  search?: string
  teamId?: string
  page?: number
  limit?: number
}

export function useEmailTemplates(filters: TemplateFilters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.search) params.set('search', filters.search)
  if (filters.teamId) params.set('teamId', filters.teamId)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))

  return useQuery({
    queryKey: ['email-templates', filters],
    queryFn: async () => {
      const res = await fetch(`/api/crm/templates?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch templates')
      return res.json()
    },
  })
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/crm/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create template')
      }
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-templates'] }) },
  })
}
