'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  replyTo?: {
    fromAddress: string
    fromName: string | null
    subject: string
  } | null
}

export function EmailCompose({ open, onOpenChange, replyTo }: EmailComposeProps) {
  const { sendEmail } = useAppStore()
  const [to, setTo] = useState(replyTo?.fromAddress || '')
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : ''
  )
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!to.trim() || !subject.trim()) return

    setSending(true)
    try {
      await sendEmail({ to, subject, body })
      toast.success('Email envoyé avec succès')
      onOpenChange(false)
      resetForm()
    } catch {
      toast.error("Erreur lors de l'envoi de l'email")
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setTo('')
    setSubject('')
    setBody('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm()
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{replyTo ? 'Répondre' : 'Nouvel email'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">À</Label>
            <Input
              id="email-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinataire@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Objet</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Rédigez votre message..."
              rows={8}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
