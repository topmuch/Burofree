'use client'

/**
 * DPO Contact Form — Submit a request to the Data Protection Officer
 *
 * Features:
 *  - Fields: name, email, subject, message
 *  - Submits to POST /api/dpo/contact (public endpoint)
 *  - Success/error feedback with toast
 *  - Loading state during submission
 *  - Form validation matching Zod schema
 */

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mail, Send, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────

interface DpoContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

interface DpoContactFormProps {
  /** Pre-fill name if user is known */
  defaultName?: string
  /** Pre-fill email if user is known */
  defaultEmail?: string
}

// ─── Validation ───────────────────────────────────────────────────────────

function validateForm(data: DpoContactFormData): string | null {
  if (!data.name.trim()) return 'Le nom est requis'
  if (data.name.length > 200) return 'Le nom ne doit pas dépasser 200 caractères'
  if (!data.email.trim()) return 'L\'email est requis'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'L\'email n\'est pas valide'
  if (data.email.length > 200) return 'L\'email ne doit pas dépasser 200 caractères'
  if (!data.subject.trim()) return 'Le sujet est requis'
  if (data.subject.length > 500) return 'Le sujet ne doit pas dépasser 500 caractères'
  if (!data.message.trim()) return 'Le message est requis'
  if (data.message.length < 10) return 'Le message doit contenir au moins 10 caractères'
  if (data.message.length > 5000) return 'Le message ne doit pas dépasser 5000 caractères'
  return null
}

// ─── Component ────────────────────────────────────────────────────────────

export function DpoContactForm({ defaultName = '', defaultEmail = '' }: DpoContactFormProps) {
  const [form, setForm] = useState<DpoContactFormData>({
    name: defaultName,
    email: defaultEmail,
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const updateField = useCallback((field: keyof DpoContactFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm(form)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/dpo/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Trop de requêtes. Veuillez réessayer plus tard.')
          return
        }
        toast.error(data.error || 'Erreur lors de l\'envoi de la demande')
        return
      }

      toast.success('Votre demande a été envoyée au DPO. Vous recevrez une réponse sous 30 jours.')
      setSubmitted(true)
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }, [form])

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-emerald-400 mb-1">Demande envoyée</h3>
            <p className="text-xs text-muted-foreground">
              Votre demande a été transmise au Délégué à la Protection des Données.
              Vous recevrez une réponse sous 30 jours.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false)
                setForm({ name: defaultName, email: defaultEmail, subject: '', message: '' })
              }}
              variant="ghost"
              size="sm"
              className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              Envoyer une autre demande
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Mail className="w-4 h-4 text-emerald-400" />
          Contacter le DPO
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <Input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Votre nom"
                className="bg-secondary text-sm"
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="votre@email.fr"
                className="bg-secondary text-sm"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sujet</Label>
            <Input
              value={form.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              placeholder="Objet de votre demande"
              className="bg-secondary text-sm"
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={form.message}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Décrivez votre demande en détail (minimum 10 caractères)..."
              className="bg-secondary text-sm min-h-[100px] resize-y"
              disabled={submitting}
              required
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {form.message.length}/5000
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Réponse sous 30 jours conformément au RGPD
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
              size="sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
