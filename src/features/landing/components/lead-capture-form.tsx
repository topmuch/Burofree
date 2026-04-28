'use client'

/**
 * Lead Capture Form — Inline CTA form for the landing page
 *
 * Features:
 *  - Email + optional name fields
 *  - Zod-style client validation
 *  - Auto-attach UTM params via useUTM hook
 *  - Success/error states with visual feedback
 *  - CTA tracking events
 *  - Accessible: labels, error announcements, focus management
 */

import { useState, useCallback, useRef } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { trackCTAClick, trackEvent } from '../utils/tracking'
import { useUTM } from '../utils/use-utm'

interface LeadCaptureFormProps {
  /** Source identifier for analytics (e.g. 'hero', 'bottom_cta') */
  source?: string
  /** CTA button text */
  ctaText?: string
  /** Show name field */
  showName?: boolean
  /** Variant style */
  variant?: 'default' | 'compact' | 'inline'
  /** Additional CSS classes */
  className?: string
}

export function LeadCaptureForm({
  source = 'hero',
  ctaText = 'Commencer gratuitement',
  showName = true,
  variant = 'default',
  className = '',
}: LeadCaptureFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { utm, clearUTM } = useUTM()
  const emailRef = useRef<HTMLInputElement>(null)

  const validateEmail = useCallback((value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMsg('')

      if (!email.trim()) {
        setErrorMsg('L\'adresse email est requise')
        setStatus('error')
        emailRef.current?.focus()
        return
      }

      if (!validateEmail(email)) {
        setErrorMsg('Adresse email invalide')
        setStatus('error')
        emailRef.current?.focus()
        return
      }

      setStatus('loading')
      trackCTAClick(`lead_form_${source}`, source)

      try {
        const res = await fetch('/api/landing/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            name: name.trim() || undefined,
            source,
            utmSource: utm.utm_source ?? undefined,
            utmMedium: utm.utm_medium ?? undefined,
            utmCampaign: utm.utm_campaign ?? undefined,
            utmContent: utm.utm_content ?? undefined,
          }),
        })

        const data = await res.json()

        if (res.ok) {
          setStatus('success')
          setEmail('')
          setName('')
          clearUTM()
          trackEvent('lead_captured', { source, has_name: !!name.trim() })
        } else {
          setErrorMsg(data.error || 'Erreur lors de l\'inscription')
          setStatus('error')
        }
      } catch {
        setErrorMsg('Erreur réseau. Veuillez réessayer.')
        setStatus('error')
      }
    },
    [email, name, source, utm, clearUTM, validateEmail],
  )

  if (status === 'success') {
    return (
      <div
        className={`flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500">
          <Check className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Inscription réussie !
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vérifiez votre boîte mail pour confirmer votre adresse.
          </p>
        </div>
      </div>
    )
  }

  const isCompact = variant === 'compact'
  const isInline = variant === 'inline'

  return (
    <form
      onSubmit={handleSubmit}
      className={`${className}`}
      noValidate
      role="form"
      aria-label="Formulaire d'inscription"
    >
      <div className={`flex flex-col ${isInline ? 'sm:flex-row' : isCompact ? 'sm:flex-row' : 'gap-3'}`}>
        {showName && !isCompact && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom"
            className={`px-4 py-3 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow ${
              isInline ? 'flex-1' : ''
            }`}
            aria-label="Prénom (optionnel)"
            autoComplete="given-name"
          />
        )}
        <input
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') {
              setStatus('idle')
              setErrorMsg('')
            }
          }}
          placeholder="votre@email.com"
          required
          className={`px-4 py-3 text-sm rounded-xl border ${
            status === 'error'
              ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500'
          } bg-white dark:bg-zinc-900 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${isInline || isCompact ? 'flex-1' : ''}`}
          aria-label="Adresse email"
          aria-describedby={errorMsg ? `lead-error-${source}` : undefined}
          aria-invalid={status === 'error'}
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`group inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 whitespace-nowrap ${
            isCompact ? 'py-2.5' : ''
          }`}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {ctaText}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
      {errorMsg && (
        <p
          id={`lead-error-${source}`}
          className="mt-2 text-xs text-red-500 dark:text-red-400"
          role="alert"
          aria-live="assertive"
        >
          {errorMsg}
        </p>
      )}
      {!isCompact && (
        <p className="mt-2 text-xs text-muted-foreground">
          Gratuit, sans carte bancaire.{' '}
          <a href="/legal/privacy" className="underline hover:text-foreground transition-colors">
            Confidentialité
          </a>
        </p>
      )}
    </form>
  )
}
