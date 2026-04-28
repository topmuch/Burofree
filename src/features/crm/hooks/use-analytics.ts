'use client'

import { useQuery } from '@tanstack/react-query'

type Period = '7d' | '30d' | '90d'

export interface OverviewData {
  totalContacts: number
  activeDeals: number
  pipelineValue: number
  winRate: number
  avgResponseTime: number
  contactGrowth: number
  dealGrowth: number
  recentContacts: { id: string; firstName: string | null; lastName: string; email: string | null; lifecycle: string; createdAt: string }[]
  topDeals: { id: string; title: string; value: number; status: string; stageId: string; probability: number }[]
}

export interface ContactStatsData {
  total: number
  newThisPeriod: number
  bySource: { source: string; count: number }[]
  byLifecycle: { lifecycle: string; count: number }[]
  byStatus: { status: string; count: number }[]
  averageScore: number
}

export interface PipelineStatsData {
  totalValue: number
  dealsCount: number
  byStage: { stageId: string; stageName: string; count: number; value: number }[]
  winRate: number
  avgCloseDays: number
  wonValue: number
  lostValue: number
  openValue: number
}

export interface RevenueForecastData {
  pipelineId: string
  pipelineName: string
  stages: { stageId: string; stageName: string; probability: number; totalValue: number; weightedValue: number }[]
  totalWeighted: number
  totalUnweighted: number
}

export interface CampaignStatsData {
  totalCampaigns: number
  activeCampaigns: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  openRate: number
  clickRate: number
  bounceRate: number
  byStatus: { status: string; count: number }[]
  overTime: { date: string; sent: number; opened: number; clicked: number }[]
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

export function useAnalyticsOverview(period: Period) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'overview', period],
    queryFn: () => fetchJson<OverviewData>(`/api/crm/analytics/overview?period=${period}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useContactStats(period: Period) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'contacts', period],
    queryFn: () => fetchJson<ContactStatsData>(`/api/crm/analytics/contacts?period=${period}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePipelineStats(period: Period) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'pipeline', period],
    queryFn: () => fetchJson<{ stats: PipelineStatsData; forecast: RevenueForecastData[] }>(`/api/crm/analytics/pipeline?period=${period}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCampaignStats(period: Period) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'campaigns', period],
    queryFn: () => fetchJson<CampaignStatsData>(`/api/crm/analytics/campaigns?period=${period}`),
    staleTime: 5 * 60 * 1000,
  })
}
