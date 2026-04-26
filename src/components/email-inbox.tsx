'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore, type Email } from '@/lib/store'
import { EmailCompose } from '@/components/email-compose'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Mail,
  Star,
  Plus,
  Search,
  Send,
  Inbox,
  BookmarkCheck,
  ArrowLeft,
  Reply,
  Trash2,
  User,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const filterOptions = [
  { value: 'all', label: 'Tous', icon: Inbox },
  { value: 'unread', label: 'Non lus', icon: Mail },
  { value: 'starred', label: 'Favoris', icon: BookmarkCheck },
  { value: 'sent', label: 'Envoyés', icon: Send },
]

export function EmailInbox() {
  const { emails, selectedEmail, setSelectedEmail, updateEmail, deleteEmail, emailFilter, setEmailFilter, fetchEmails } = useAppStore()
  const [showCompose, setShowCompose] = useState(false)
  const [replyTo, setReplyTo] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEmails = emails.filter((email) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        email.subject.toLowerCase().includes(q) ||
        (email.fromName || '').toLowerCase().includes(q) ||
        email.fromAddress.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleStar = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation()
    await updateEmail(email.id, { isStarred: !email.isStarred })
  }

  const handleMarkRead = async (email: Email) => {
    if (!email.isRead) {
      await updateEmail(email.id, { isRead: true })
    }
    setSelectedEmail(email)
  }

  const handleDelete = async (id: string) => {
    await deleteEmail(id)
    toast.success('Email supprimé')
  }

  const handleReply = (email: Email) => {
    setReplyTo(email)
    setShowCompose(true)
  }

  const handleFilterChange = async (value: string) => {
    setEmailFilter(value)
    // Need to refetch emails with new filter
    const res = await fetch(`/api/emails${value !== 'all' ? `?filter=${value}` : ''}`)
    const data = await res.json()
    useAppStore.setState({ emails: data.emails || [] })
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) return name[0].toUpperCase()
    return email[0].toUpperCase()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Emails</h1>
          <p className="text-muted-foreground text-sm">Gérez votre messagerie professionnelle</p>
        </div>
        <Button onClick={() => { setReplyTo(null); setShowCompose(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau message
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {filterOptions.map((opt) => {
            const Icon = opt.icon
            return (
              <Button
                key={opt.value}
                variant={emailFilter === opt.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterChange(opt.value)}
                className="text-xs h-7 gap-1"
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </Button>
            )
          })}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Email layout - list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-280px)] min-h-[400px]">
        {/* Email List */}
        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 border-b">
            <span className="text-sm font-medium">
              {filteredEmails.length} message{filteredEmails.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar max-h-full" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            {filteredEmails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun email</p>
              </div>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => handleMarkRead(email)}
                  className={`flex items-start gap-3 px-3 py-3 border-b cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedEmail?.id === email.id ? 'bg-accent' : ''
                  } ${!email.isRead ? 'email-item-unread' : 'email-item-read'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-medium text-primary">
                    {getInitials(email.fromName, email.fromAddress)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                        {email.isSent ? `À: ${email.toAddress}` : email.fromName || email.fromAddress}
                      </p>
                      <button
                        onClick={(e) => handleStar(email, e)}
                        className="flex-shrink-0 ml-auto"
                      >
                        <Star
                          className={`h-3.5 w-3.5 transition-colors ${
                            email.isStarred
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-muted-foreground/30 hover:text-amber-400'
                          }`}
                        />
                      </button>
                    </div>
                    <p className={`text-sm truncate ${!email.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
                      {email.subject}
                    </p>
                    {email.snippet && (
                      <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{email.snippet}</p>
                    )}
                    <span className="text-xs text-muted-foreground/40 mt-1 block">
                      {format(parseISO(email.receivedAt), 'd MMM HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Detail */}
        <div className="lg:col-span-3 border rounded-lg overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedEmail ? (
              <motion.div
                key={selectedEmail.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="h-full flex flex-col"
              >
                {/* Email header */}
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-sm">{selectedEmail.subject}</h2>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReply(selectedEmail)}
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => handleDelete(selectedEmail.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 lg:hidden"
                        onClick={() => setSelectedEmail(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-medium text-primary">
                      {getInitials(selectedEmail.fromName, selectedEmail.fromAddress)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {selectedEmail.fromName || selectedEmail.fromAddress}
                        <span className="text-muted-foreground font-normal ml-2 text-xs">
                          &lt;{selectedEmail.fromAddress}&gt;
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        À: {selectedEmail.toAddress} • {format(parseISO(selectedEmail.receivedAt), 'd MMMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email body */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedEmail.body || selectedEmail.snippet || 'Aucun contenu'}
                  </div>
                </div>

                {/* Reply bar */}
                <div className="border-t p-3 bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReply(selectedEmail)}
                    className="gap-2"
                  >
                    <Reply className="h-4 w-4" />
                    Répondre
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center text-muted-foreground"
              >
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sélectionnez un email pour le lire</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <EmailCompose
        open={showCompose}
        onOpenChange={setShowCompose}
        replyTo={replyTo ? {
          fromAddress: replyTo.fromAddress,
          fromName: replyTo.fromName,
          subject: replyTo.subject,
        } : null}
      />
    </motion.div>
  )
}
