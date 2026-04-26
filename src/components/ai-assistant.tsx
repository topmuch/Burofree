'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, Zap, Calendar, AlertTriangle, Eye } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const quickActions = [
  { label: 'Briefing', icon: Zap, action: 'briefing' as const },
  { label: 'Mon planning', icon: Calendar, action: 'planning' as const },
  { label: 'Urgences', icon: AlertTriangle, action: 'urgences' as const },
  { label: 'Mode Focus', icon: Eye, action: 'focus' as const },
]

export function AiAssistant() {
  const {
    chatOpen, setChatOpen, chatMessages, sendChatMessage,
    suggestions, fetchBriefing, focusMode, setFocusMode
  } = useAppStore()

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const unreadSuggestions = suggestions.length

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [chatOpen])

  const handleSend = async () => {
    const message = input.trim()
    if (!message || isSending) return

    setInput('')
    setIsSending(true)
    try {
      await sendChatMessage(message)
    } finally {
      setIsSending(false)
    }
  }

  const handleQuickAction = async (action: 'briefing' | 'planning' | 'urgences' | 'focus') => {
    if (isSending) return

    switch (action) {
      case 'briefing':
        setIsSending(true)
        try {
          await fetchBriefing()
          const briefing = useAppStore.getState().briefing
          if (briefing) {
            // Add briefing as assistant message if not already in chat
            useAppStore.setState((s) => ({
              chatMessages: [...s.chatMessages, {
                id: `briefing-${Date.now()}`,
                role: 'assistant',
                content: briefing,
                userId: '',
                createdAt: new Date().toISOString()
              }]
            }))
          }
        } finally {
          setIsSending(false)
        }
        break
      case 'planning':
        setIsSending(true)
        setInput('')
        try {
          await sendChatMessage('Quel est mon planning aujourd\'hui ?')
        } finally {
          setIsSending(false)
        }
        break
      case 'urgences':
        setIsSending(true)
        setInput('')
        try {
          await sendChatMessage('Quelles sont mes urgences ?')
        } finally {
          setIsSending(false)
        }
        break
      case 'focus':
        setFocusMode(!focusMode)
        break
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setChatOpen(!chatOpen)}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl z-50 flex items-center justify-center',
          'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500',
          'transition-shadow hover:shadow-emerald-500/25'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {chatOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-white" />
        )}

        {/* Unread badge */}
        {unreadSuggestions > 0 && !chatOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge className="h-5 min-w-[20px] text-[10px] px-1.5 bg-amber-500 text-white border-0 flex items-center justify-center">
              {unreadSuggestions}
            </Badge>
          </motion.div>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-24 right-6 w-[400px] h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Maellis</h3>
                  <p className="text-[10px] text-zinc-500">Assistant intelligent</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(false)}
                className="h-7 w-7 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 px-4 py-3 border-b border-zinc-800 overflow-x-auto custom-scrollbar">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.action)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-zinc-800 text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-700 hover:border-emerald-500/30"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">Bonjour ! 👋</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">
                    Je suis votre assistant freelance. Posez-moi une question ou utilisez les actions rapides ci-dessus.
                  </p>
                </div>
              )}

              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'chat-bubble-user text-white'
                        : 'chat-bubble-assistant text-zinc-200'
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Loading dots */}
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="chat-bubble-assistant px-4 py-3 flex items-center gap-1">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
                    />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez un message..."
                  className="flex-1 h-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 text-sm focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  size="icon"
                  className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
