/**
 * Campaign Dashboard Component
 * Lists campaigns with stats, summary cards, and visual charts.
 */
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import { Send, Eye, MousePointer, AlertTriangle, Mail, UserX, Plus, Search, Calendar, BarChart3 } from 'lucide-react'
import { useCampaigns, useCampaignStats } from '../hooks/use-campaigns'

const STATUS_VARIANT: Record<string, { variant: 'secondary' | 'default' | 'outline' | 'destructive'; color: string }> = {
  draft: { variant: 'secondary', color: 'bg-zinc-500/20 text-zinc-400' },
  scheduled: { variant: 'outline', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  sending: { variant: 'default', color: 'bg-emerald-500/20 text-emerald-400 animate-pulse' },
  sent: { variant: 'default', color: 'bg-emerald-500/20 text-emerald-400' },
  paused: { variant: 'outline', color: 'bg-amber-500/20 text-amber-400' },
  cancelled: { variant: 'destructive', color: 'bg-rose-500/20 text-rose-400' },
}

interface CampaignDashboardProps {
  onNewCampaign?: () => void
  onEditCampaign?: (id: string) => void
}

export function CampaignDashboard({ onNewCampaign, onEditCampaign }: CampaignDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const { data, isLoading } = useCampaigns({
    status: statusFilter || undefined,
    search: search || undefined,
  })

  const campaigns = data?.campaigns ?? []

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { icon: Send, label: 'Sent', value: campaigns.filter(c => c.status === 'sent').length, color: 'text-emerald-400' },
          { icon: Mail, label: 'Delivered', value: campaigns.reduce((s, c) => s + (JSON.parse(c.stats || '{}').delivered ?? 0), 0), color: 'text-blue-400' },
          { icon: Eye, label: 'Opened', value: campaigns.reduce((s, c) => s + (JSON.parse(c.stats || '{}').opened ?? 0), 0), color: 'text-amber-400' },
          { icon: MousePointer, label: 'Clicked', value: campaigns.reduce((s, c) => s + (JSON.parse(c.stats || '{}').clicked ?? 0), 0), color: 'text-purple-400' },
          { icon: AlertTriangle, label: 'Bounced', value: campaigns.reduce((s, c) => s + (JSON.parse(c.stats || '{}').bounced ?? 0), 0), color: 'text-rose-400' },
          { icon: UserX, label: 'Unsubscribed', value: campaigns.reduce((s, c) => s + (JSON.parse(c.stats || '{}').unsubscribed ?? 0), 0), color: 'text-zinc-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-zinc-950/30 border-zinc-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs text-zinc-400">{label}</span>
                </div>
                <p className="text-xl font-bold text-zinc-100 mt-1">{value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="bg-zinc-950/30 border-zinc-800 text-zinc-200 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-zinc-950/30 border-zinc-800 text-zinc-200">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="sending">Sending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={onNewCampaign}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </Button>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-zinc-950/30 border-zinc-800 animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="bg-zinc-950/30 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-zinc-300 font-medium">No campaigns yet</h3>
            <p className="text-zinc-500 text-sm mt-1">Create your first campaign to start reaching your contacts.</p>
            <Button
              onClick={onNewCampaign}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {campaigns.map((campaign: Record<string, unknown>) => {
            const stats = JSON.parse((campaign.stats as string) || '{}')
            const statusInfo = STATUS_VARIANT[(campaign.status as string)] || STATUS_VARIANT.draft
            const recipientCount = (campaign as { _count?: { recipients: number } })._count?.recipients ?? 0

            return (
              <motion.div
                key={campaign.id as string}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card
                  className="bg-zinc-950/30 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  onClick={() => onEditCampaign?.(campaign.id as string)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-zinc-100 truncate">
                            {campaign.name as string}
                          </h3>
                          <Badge className={statusInfo.color} variant={statusInfo.variant}>
                            {(campaign.status as string)}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {(campaign.subject as string)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 ml-4 text-xs text-zinc-500">
                        {recipientCount > 0 && (
                          <span>{recipientCount} recipients</span>
                        )}
                        <div className="flex items-center gap-3">
                          {stats.opened > 0 && (
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {stats.opened}</span>
                          )}
                          {stats.clicked > 0 && (
                            <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" /> {stats.clicked}</span>
                          )}
                        </div>
                        {!!campaign.scheduleAt && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(campaign.scheduleAt as string).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
