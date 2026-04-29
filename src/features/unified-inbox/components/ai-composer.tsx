'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Sparkles,
  Paperclip,
  RotateCcw,
  Check,
  X,
  Loader2,
  Reply,
  Forward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  useSendMessage,
  useGenerateAIReply,
} from '../hooks/use-inbox-query'
import type { AITone, AIReplyResult } from '../types'

interface AIComposerProps {
  conversationId: string
  channel: string
  replyToMessageId?: string
  mode?: 'reply' | 'forward' | 'compose'
  onSent?: () => void
  className?: string
}

const TONE_OPTIONS: { value: AITone; label: string; icon: string }[] = [
  { value: 'pro', label: 'Pro', icon: '💼' },
  { value: 'friendly', label: 'Amical', icon: '😊' },
  { value: 'formal', label: 'Formel', icon: '🎩' },
]

export function AIComposer({
  conversationId,
  channel,
  replyToMessageId,
  mode = 'reply',
  onSent,
  className = '',
}: AIComposerProps) {
  const [body, setBody] = useState('')
  const [tone, setTone] = useState<AITone>('pro')
  const [aiDraft, setAiDraft] = useState<AIReplyResult | null>(null)
  const [showAiDraft, setShowAiDraft] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const sendMessage = useSendMessage()
  const generateAIReply = useGenerateAIReply()

  const handleGenerateAI = useCallback(async () => {
    try {
      const result = await generateAIReply.mutateAsync({
        conversationId,
        tone,
      })
      setAiDraft(result)
      setShowAiDraft(true)
      setBody(result.draft)
      textareaRef.current?.focus()
    } catch {
      // Error handled by mutation
    }
  }, [conversationId, tone, generateAIReply])

  const handleAcceptDraft = useCallback(() => {
    setShowAiDraft(false)
    setAiDraft(null)
    textareaRef.current?.focus()
  }, [])

  const handleRejectDraft = useCallback(() => {
    setShowAiDraft(false)
    setAiDraft(null)
    setBody('')
  }, [])

  const handleSend = useCallback(async () => {
    if (!body.trim() || sendMessage.isPending) return

    try {
      await sendMessage.mutateAsync({
        conversationId,
        data: {
          body: body.trim(),
          replyToMessageId,
        },
      })
      setBody('')
      setAiDraft(null)
      setShowAiDraft(false)
      onSent?.()
    } catch {
      // Error handled by mutation
    }
  }, [body, conversationId, replyToMessageId, sendMessage, onSent])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const isSending = sendMessage.isPending
  const isGenerating = generateAIReply.isPending

  return (
    <div className={`border-t border-zinc-800 bg-zinc-900/80 ${className}`}>
      {/* AI Draft Banner */}
      <AnimatePresence>
        {showAiDraft && aiDraft && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/5 border-b border-purple-500/15">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] text-purple-300 font-medium flex-1">
                Brouillon IA généré ({aiDraft.contextUsed.messageCount} messages
                analysés)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAcceptDraft}
                  className="h-6 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Accepter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRejectDraft}
                  className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="w-3 h-3 mr-1" />
                  Refuser
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode indicator */}
      <div className="flex items-center gap-2 px-3 pt-2">
        {mode === 'reply' && (
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-[9px] gap-0.5 bg-sky-500/10 border-sky-500/20 text-sky-400"
          >
            <Reply className="w-2.5 h-2.5" />
            Réponse
          </Badge>
        )}
        {mode === 'forward' && (
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-[9px] gap-0.5 bg-amber-500/10 border-amber-500/20 text-amber-400"
          >
            <Forward className="w-2.5 h-2.5" />
            Transférer
          </Badge>
        )}

        {/* Tone selector */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[9px] text-zinc-500 mr-1">Ton :</span>
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTone(opt.value)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                tone === opt.value
                  ? 'bg-zinc-800 text-zinc-200 ring-1 ring-zinc-600'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea + actions */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'forward'
                ? 'Ajoutez un message de transfert...'
                : 'Écrivez votre réponse...'
            }
            className="min-h-[60px] max-h-[160px] resize-none bg-zinc-800/50 border-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1">
          {/* AI Generate button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGenerateAI}
            disabled={isGenerating || !conversationId}
            className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 disabled:text-zinc-600"
            title="Générer une réponse IA"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </Button>

          {/* Attach button (UI only) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            title="Joindre un fichier"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Send button */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!body.trim() || isSending}
            className="h-8 w-8 bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-zinc-800 disabled:text-zinc-600"
            title="Envoyer (Cmd+Entrée)"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Attachments area (UI placeholder) */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1.5" />
      </div>
    </div>
  )
}
