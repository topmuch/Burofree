'use client'

import { Eye, Pen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PresenceUser } from '../types'

interface PresenceBadgeProps {
  users: PresenceUser[]
  className?: string
}

export function PresenceBadge({ users, className = '' }: PresenceBadgeProps) {
  if (!users || users.length === 0) return null

  const typingUsers = users.filter((u) => u.status === 'typing')
  const viewingUsers = users.filter((u) => u.status === 'viewing')
  const maxDisplay = 3
  const overflow = users.length - maxDisplay

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">
            {typingUsers[0].name} écrit...
          </span>
        </div>
      )}

      {/* Viewing avatars */}
      {viewingUsers.length > 0 && (
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3 text-zinc-500" />
          <div className="flex -space-x-1.5">
            {viewingUsers.slice(0, maxDisplay).map((user) => (
              <Avatar
                key={user.id}
                className="w-5 h-5 border-2 border-zinc-900 ring-1 ring-zinc-700"
              >
                <AvatarImage src={user.avatar ?? undefined} />
                <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-300">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {overflow > 0 && (
            <span className="text-[10px] text-zinc-500 ml-0.5">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
