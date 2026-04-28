'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  MessageCircle,
  Smartphone,
  Hash,
  Filter,
  Star,
  UserCheck,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ChannelBadge } from './channel-badge'
import type { ChannelType, ConversationFilters } from '../types'

interface FilterSidebarProps {
  filters: ConversationFilters
  onFiltersChange: (filters: ConversationFilters) => void
  className?: string
}

const CHANNEL_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'slack', label: 'Slack' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Ouvert', color: 'bg-emerald-500' },
  { value: 'pending', label: 'En attente', color: 'bg-amber-500' },
  { value: 'closed', label: 'Fermé', color: 'bg-zinc-500' },
  { value: 'spam', label: 'Spam', color: 'bg-red-500' },
]

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
  { value: 'high', label: 'Élevée', color: 'text-amber-400' },
  { value: 'normal', label: 'Normal', color: 'text-zinc-400' },
  { value: 'low', label: 'Basse', color: 'text-zinc-500' },
]

export function FilterSidebar({
  filters,
  onFiltersChange,
  className = '',
}: FilterSidebarProps) {
  const [focusInbox, setFocusInbox] = useState(filters.focusInbox ?? false)

  const activeFilterCount = [
    filters.channel,
    filters.status,
    filters.priority,
    filters.assignedTo,
    filters.isStarred,
    filters.search,
  ].filter(Boolean).length

  const updateFilter = useCallback(
    (key: keyof ConversationFilters, value: unknown) => {
      onFiltersChange({ ...filters, [key]: value || undefined, cursor: undefined })
    },
    [filters, onFiltersChange],
  )

  const clearAll = useCallback(() => {
    onFiltersChange({ limit: filters.limit })
    setFocusInbox(false)
  }, [filters.limit, onFiltersChange])

  const toggleChannel = useCallback(
    (channel: ChannelType) => {
      updateFilter('channel', filters.channel === channel ? undefined : channel)
    },
    [filters.channel, updateFilter],
  )

  const toggleStatus = useCallback(
    (status: string) => {
      updateFilter('status', filters.status === status ? undefined : status)
    },
    [filters.status, updateFilter],
  )

  const togglePriority = useCallback(
    (priority: string) => {
      updateFilter(
        'priority',
        filters.priority === priority ? undefined : priority,
      )
    },
    [filters.priority, updateFilter],
  )

  const toggleFocusInbox = useCallback(
    (enabled: boolean) => {
      setFocusInbox(enabled)
      onFiltersChange({
        ...filters,
        focusInbox: enabled || undefined,
        cursor: undefined,
      })
    },
    [filters, onFiltersChange],
  )

  return (
    <div className={`flex flex-col h-full bg-zinc-900/50 ${className}`}>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-200">Filtres</span>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                Tout effacer
              </Button>
            )}
          </div>

          {/* Focus Inbox Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-zinc-200 font-medium">
                Inbox Focus
              </span>
            </div>
            <Switch
              checked={focusInbox}
              onCheckedChange={toggleFocusInbox}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Raccourcis
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateFilter('status', filters.status ? undefined : 'open')
                }
                className={`h-7 px-2.5 text-[11px] ${
                  filters.status === 'open'
                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Mail className="w-3 h-3 mr-1" />
                Non lu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateFilter(
                    'isStarred',
                    filters.isStarred ? undefined : true,
                  )
                }
                className={`h-7 px-2.5 text-[11px] ${
                  filters.isStarred
                    ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Star className="w-3 h-3 mr-1" />
                Favoris
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateFilter(
                    'assignedTo',
                    filters.assignedTo ? undefined : 'me',
                  )
                }
                className={`h-7 px-2.5 text-[11px] ${
                  filters.assignedTo === 'me'
                    ? 'bg-sky-500/15 text-sky-400 hover:bg-sky-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <UserCheck className="w-3 h-3 mr-1" />
                Mes assignés
              </Button>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Channel Filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Canal
            </span>
            <div className="space-y-1">
              {CHANNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleChannel(opt.value)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    filters.channel === opt.value
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <ChannelBadge channel={opt.value} size="sm" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Status Filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Statut
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleStatus(opt.value)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    filters.status === opt.value
                      ? 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${opt.color}`}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Priority Filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Priorité
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => togglePriority(opt.value)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    filters.priority === opt.value
                      ? 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Active Filter Badges */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="border-t border-zinc-800 p-3"
          >
            <div className="flex flex-wrap gap-1">
              {filters.channel && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 bg-zinc-800 border-zinc-700 text-zinc-300"
                >
                  {filters.channel}
                  <X
                    className="w-2.5 h-2.5 cursor-pointer hover:text-zinc-100"
                    onClick={() => updateFilter('channel', undefined)}
                  />
                </Badge>
              )}
              {filters.status && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 bg-zinc-800 border-zinc-700 text-zinc-300"
                >
                  {filters.status}
                  <X
                    className="w-2.5 h-2.5 cursor-pointer hover:text-zinc-100"
                    onClick={() => updateFilter('status', undefined)}
                  />
                </Badge>
              )}
              {filters.priority && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 bg-zinc-800 border-zinc-700 text-zinc-300"
                >
                  {filters.priority}
                  <X
                    className="w-2.5 h-2.5 cursor-pointer hover:text-zinc-100"
                    onClick={() => updateFilter('priority', undefined)}
                  />
                </Badge>
              )}
              {filters.isStarred && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 bg-amber-500/10 border-amber-500/25 text-amber-400"
                >
                  <Star className="w-2.5 h-2.5" />
                  Favoris
                  <X
                    className="w-2.5 h-2.5 cursor-pointer hover:text-amber-300"
                    onClick={() => updateFilter('isStarred', undefined)}
                  />
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
