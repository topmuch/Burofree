'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Mail, Send, Trash2, ArrowRight, Sparkles, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAppStore, Email } from '@/lib/store'
import { cn } from '@/lib/utils'

const categoryConfig: Record<string, { label: string; color: string }> = {
  client: { label: 'Client', color: 'bg-emerald-500/20 text-emerald-400' },
  admin: { label: 'Admin', color: 'bg-amber-500/20 text-amber-400' },
  newsletter: { label: 'Newsletter', color: 'bg-slate-500/20 text-slate-400' },
  spam: { label: 'Spam', color: 'bg-red-500/20 text-red-400' },
}

function EmailDetail({ email, onClose }: { email: Email; onClose: () => void }) {
  const { updateEmail, deleteEmail, convertEmailToTask } = useAppStore()
  const [aiReply, setAiReply] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerateReply = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Propose une réponse professionnelle en français à cet email:\nDe: ${email.fromName || email.fromAddress}\nSujet: ${email.subject}\nContenu: ${email.body || email.snippet}` }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiReply(data.message)
      }
    } catch (e) {
      console.error('AI reply error:', e)
    }
    setGenerating(false)
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
      <Card className="h-full">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{email.subject}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>De: {email.fromName || email.fromAddress}</span>
                <span>·</span>
                <span>{new Date(email.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-xs text-muted-foreground">À: {email.toAddress}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateEmail(email.id, { isStarred: !email.isStarred })}>
                <Star className={cn('w-4 h-4', email.isStarred && 'fill-amber-400 text-amber-400')} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 rounded-lg bg-secondary/50 text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
            {email.body || email.snippet || 'Pas de contenu'}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handleGenerateReply} disabled={generating}>
              <Sparkles className="w-3 h-3 mr-1" /> {generating ? 'Génération...' : 'Réponse IA'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => convertEmailToTask(email.id)}>
              <ArrowRight className="w-3 h-3 mr-1" /> Convertir en tâche
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => updateEmail(email.id, { isRead: !email.isRead })}>
              <Mail className="w-3 h-3 mr-1" /> {email.isRead ? 'Marquer non lu' : 'Marquer lu'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-red-400 hover:text-red-300" onClick={() => { deleteEmail(email.id); onClose() }}>
              <Trash2 className="w-3 h-3 mr-1" /> Supprimer
            </Button>
          </div>

          {/* AI Reply */}
          <AnimatePresence>
            {aiReply && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium">Réponse proposée par l&apos;IA</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{aiReply}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white">Utiliser ce brouillon</Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAiReply('')}>Ignorer</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ComposeEmail() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const { sendEmail } = useAppStore()

  const handleSend = () => {
    if (!to || !subject) return
    sendEmail({ to, subject, body })
    setTo('')
    setSubject('')
    setBody('')
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>À *</Label>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@exemple.com" className="bg-secondary" />
      </div>
      <div>
        <Label>Sujet *</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet de l'email" className="bg-secondary" />
      </div>
      <div>
        <Label>Message</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre message..." className="bg-secondary min-h-[120px]" />
      </div>
      <Button onClick={handleSend} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
        <Send className="w-4 h-4 mr-2" /> Envoyer
      </Button>
    </div>
  )
}

export function EmailInbox() {
  const { emails, selectedEmail, setSelectedEmail, emailFilter, setEmailFilter } = useAppStore()

  const categories = [
    { id: 'all', label: 'Tous', count: emails.filter(e => !e.isSent).length },
    { id: 'client', label: 'Clients', count: emails.filter(e => !e.isSent && e.category === 'client').length },
    { id: 'admin', label: 'Admin', count: emails.filter(e => !e.isSent && e.category === 'admin').length },
    { id: 'newsletter', label: 'Newsletters', count: emails.filter(e => !e.isSent && e.category === 'newsletter').length },
    { id: 'spam', label: 'Spam', count: emails.filter(e => !e.isSent && e.category === 'spam').length },
  ]

  const filteredEmails = emails
    .filter(e => !e.isSent)
    .filter(e => emailFilter === 'all' || e.category === emailFilter)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Emails</h2>
          <p className="text-sm text-muted-foreground">{filteredEmails.length} email(s)</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Send className="w-4 h-4 mr-2" /> Nouvel email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvel email</DialogTitle>
            </DialogHeader>
            <ComposeEmail />
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant={emailFilter === cat.id ? 'default' : 'outline'}
            size="sm"
            className={cn('text-xs whitespace-nowrap', emailFilter === cat.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : '')}
            onClick={() => setEmailFilter(cat.id)}
          >
            {cat.label}
            {cat.count > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4">{cat.count}</Badge>}
          </Button>
        ))}
      </div>

      {/* Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Email List */}
        <div className={cn('lg:col-span-2 space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar', selectedEmail && 'hidden lg:block')}>
          {filteredEmails.map(email => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-all border',
                selectedEmail?.id === email.id ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-transparent hover:bg-secondary/50',
                !email.isRead ? 'email-item-unread' : 'email-item-read'
              )}
              onClick={() => setSelectedEmail(email)}
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-xs font-medium text-emerald-400">
                  {(email.fromName || email.fromAddress)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', !email.isRead && 'font-semibold')}>{email.fromName || email.fromAddress}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(email.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className={cn('text-sm truncate', !email.isRead && 'font-medium')}>{email.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{email.snippet}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge className={cn('text-[10px] h-4', categoryConfig[email.category]?.color || 'bg-slate-500/20 text-slate-400')}>
                      {categoryConfig[email.category]?.label || email.category}
                    </Badge>
                    {email.isStarred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                    {email.hasTask && <Badge className="text-[10px] h-4 bg-emerald-500/20 text-emerald-400">→ Tâche</Badge>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredEmails.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Aucun email</div>
          )}
        </div>

        {/* Email Detail */}
        <div className={cn('lg:col-span-3', !selectedEmail && 'hidden lg:block')}>
          {selectedEmail ? (
            <EmailDetail email={selectedEmail} onClose={() => setSelectedEmail(null)} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground py-12">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Sélectionnez un email pour le lire</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
