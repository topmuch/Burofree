'use client'

/**
 * Footer Section — Landing page footer
 *
 * Features:
 *  - Brand + tagline
 *  - 4-column link grid (Produit, Entreprise, Légal, Support)
 *  - Newsletter signup with inline validation
 *  - Social media links
 *  - RGPD & security badges
 *  - Copyright notice
 *  - Responsive: stacks on mobile
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Shield, Lock, Mail, Github, Twitter, Linkedin, Instagram } from 'lucide-react'
import { trackCTAClick, trackEvent } from '../utils/tracking'
import { useUTM } from '../utils/use-utm'

// ─── Link Groups ──────────────────────────────────────────────────────────────────

const LINK_GROUPS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '#features' },
      { label: 'Tarifs', href: '#pricing' },
      { label: 'Intégrations', href: '#features' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Carrières', href: '/careers' },
      { label: 'Presse', href: '/press' },
      { label: 'Contact', href: 'mailto:hello@maellis.com' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'Mentions légales', href: '/legal/mentions' },
      { label: 'Politique de confidentialité', href: '/legal/privacy' },
      { label: 'CGV', href: '/legal/cgv' },
      { label: 'Cookies', href: '/legal/cookies' },
      { label: 'RGPD', href: '/legal/rgpd' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Centre d\'aide', href: '/help' },
      { label: 'Documentation', href: '/docs' },
      { label: 'Statut', href: 'https://status.maellis.com' },
      { label: 'API', href: '/docs/api' },
      { label: 'Communauté', href: '/community' },
    ],
  },
] as const

const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com/maellis', icon: Twitter },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/maellis', icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com/maellis', icon: Github },
  { label: 'Instagram', href: 'https://www.instagram.com/maellis', icon: Instagram },
] as const

// ─── Component ────────────────────────────────────────────────────────────────────

export function FooterSection() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { utm, clearUTM } = useUTM()

  const handleNewsletterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setStatus('loading')
      setErrorMsg('')

      // Basic client-side validation
      if (!email || !email.includes('@')) {
        setErrorMsg('Adresse email invalide')
        setStatus('error')
        return
      }

      trackCTAClick('newsletter_footer', 'footer')

      try {
        const res = await fetch('/api/landing/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: name || undefined,
            source: 'newsletter_footer',
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
          trackEvent('newsletter_signup', { source: 'footer', method: 'email' })
        } else {
          setErrorMsg(data.error || 'Erreur lors de l\'inscription')
          setStatus('error')
        }
      } catch {
        setErrorMsg('Erreur réseau. Veuillez réessayer.')
        setStatus('error')
      }
    },
    [email, name, utm, clearUTM],
  )

  return (
    <footer
      className="relative bg-muted/30 border-t border-border"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Top section: Brand + Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-12 lg:mb-16">
          {/* Brand column */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="Maellis">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Buro<span className="text-emerald-500">free</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
              Votre copilote freelance intelligent. Gérez vos tâches, emails, factures et calendrier
              en un seul endroit, propulsé par l&apos;IA.
            </p>

            {/* Security badges */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span>RGPD conforme</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span>AES-256 chiffré</span>
              </div>
            </div>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                    aria-label={social.label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Newsletter column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Restez informé
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Recevez nos conseils productivité et les nouveautés Maellis. Pas de spam, promis.
            </p>

            {status === 'success' ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Mail className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Merci ! Vérifiez votre boîte mail pour confirmer.
                </p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3" noValidate>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prénom (optionnel)"
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                    aria-label="Prénom (optionnel)"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                    aria-label="Adresse email"
                    aria-describedby={errorMsg ? 'newsletter-error' : undefined}
                    aria-invalid={status === 'error'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                  >
                    {status === 'loading' ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        S&apos;inscrire
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
                {errorMsg && (
                  <p id="newsletter-error" className="text-xs text-red-500 dark:text-red-400" role="alert">
                    {errorMsg}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  En vous inscrivant, vous acceptez notre{' '}
                  <Link href="/legal/privacy" className="underline hover:text-foreground transition-colors">
                    politique de confidentialité
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Link groups */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-8 border-t border-border">
          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5" role="list">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 rounded-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Maellis. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Confidentialité
            </Link>
            <Link href="/legal/cgv" className="hover:text-foreground transition-colors">
              CGV
            </Link>
            <Link href="/legal/mentions" className="hover:text-foreground transition-colors">
              Mentions légales
            </Link>
            <Link href="/legal/cookies" className="hover:text-foreground transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
