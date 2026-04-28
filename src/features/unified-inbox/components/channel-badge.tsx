'use client'

import { Mail, MessageCircle, Smartphone, Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ChannelType } from '../types'

const channelConfig: Record<
  ChannelType,
  { icon: React.ElementType; label: string; color: string; bgColor: string }
> = {
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15 border-emerald-500/25',
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15 border-green-500/25',
  },
  sms: {
    icon: Smartphone,
    label: 'SMS',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15 border-sky-500/25',
  },
  slack: {
    icon: Hash,
    label: 'Slack',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15 border-purple-500/25',
  },
}

interface ChannelBadgeProps {
  channel: ChannelType
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ChannelBadge({
  channel,
  showLabel = false,
  size = 'sm',
  className = '',
}: ChannelBadgeProps) {
  const config = channelConfig[channel] ?? channelConfig.email
  const Icon = config.icon
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  if (showLabel) {
    return (
      <Badge
        variant="outline"
        className={`${config.bgColor} ${config.color} border text-[10px] font-medium gap-1 px-1.5 py-0.5 ${className}`}
      >
        <Icon className={iconSize} />
        {config.label}
      </Badge>
    )
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md ${config.bgColor} border ${className} ${
        size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
      }`}
      title={config.label}
    >
      <Icon className={`${iconSize} ${config.color}`} />
    </div>
  )
}

export function getChannelConfig(channel: ChannelType) {
  return channelConfig[channel] ?? channelConfig.email
}
