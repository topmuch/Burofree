'use client'

/**
 * Consent Banner — GDPR/CCPA-compliant cookie consent banner
 *
 * Features:
 *  - Appears on first visit (checks localStorage for 'burofree-consent')
 *  - Granular options: Accept All, Reject Non-Essential, Customize
 *  - Customize panel: toggle switches for analytics, functional, marketing cookies
 *  - Stores consent in localStorage and calls POST /api/consent
 *  - Conforms to CNIL requirements
 *  - Accessible: role="dialog", keyboard navigation
 *  - Animated entrance/exit with Framer Motion
 *  - Compact on mobile, wider on desktop
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Shield, Cookie, X, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────

interface ConsentPreferences {
  essential: boolean
  analytics: boolean
  functional: boolean
  marketing: boolean
}

type ConsentBannerView = 'simple' | 'customize'

// ─── Constants ────────────────────────────────────────────────────────────

const CONSENT_STORAGE_KEY = 'burofree-consent'

const DEFAULT_CONSENT: ConsentPreferences = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false,
}

const COOKIE_DESCRIPTIONS: Record<keyof ConsentPreferences, { label: string; description: string }> = {
  essential: {
    label: 'Essentiels',
    description: 'Nécessaires au fonctionnement du site. Ne peuvent pas être désactivés.',
  },
  analytics: {
    label: 'Analytique',
    description: 'Nous aident à comprendre comment vous utilisez le site pour l\'améliorer.',
  },
  functional: {
    label: 'Fonctionnels',
    description: 'Permettent des fonctionnalités améliorées et la personnalisation.',
  },
  marketing: {
    label: 'Marketing',
    description: 'Utilisés pour vous proposer des publicités pertinentes.',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getStoredConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as ConsentPreferences
  } catch {
    return null
  }
}

function storeConsent(consent: ConsentPreferences): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
  } catch {
    // Storage full or unavailable
  }
}

async function syncConsentToServer(consent: ConsentPreferences): Promise<void> {
  try {
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consents: {
          analytics: consent.analytics,
          functional: consent.functional,
          marketing: consent.marketing,
        },
      }),
    })
    if (!res.ok) {
      console.error('Failed to sync consent to server')
    }
  } catch {
    // Network error — consent is stored locally regardless
    console.error('Failed to sync consent to server')
  }
}

// ─── Component ────────────────────────────────────────────────────────────

function useInitialConsent(): {
  visible: boolean
  setVisible: (v: boolean) => void
  consent: ConsentPreferences
  setConsent: (c: ConsentPreferences) => void
} {
  const [init, setInit] = useState<{ stored: ConsentPreferences | null }>(() => ({
    stored: getStoredConsent(),
  }))

  const visible = init.stored === null
  const consent = init.stored ?? DEFAULT_CONSENT
  const [showDelayed, setShowDelayed] = useState(false)

  useEffect(() => {
    if (init.stored === null) {
      const timer = setTimeout(() => setShowDelayed(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [init.stored])

  return {
    visible: visible && showDelayed,
    setVisible: (v: boolean) => {
      if (!v) setInit({ stored: consent })
    },
    consent,
    setConsent: (c: ConsentPreferences) => setInit({ stored: c }),
  }
}

export function ConsentBanner() {
  const { visible, setVisible, consent, setConsent } = useInitialConsent()
  const [view, setView] = useState<ConsentBannerView>('simple')
  const [saving, setSaving] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const handleAcceptAll = useCallback(async () => {
    const fullConsent: ConsentPreferences = {
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
    }
    setSaving(true)
    storeConsent(fullConsent)
    setConsent(fullConsent)
    await syncConsentToServer(fullConsent)
    setSaving(false)
    setVisible(false)
    toast('Tous les cookies acceptés', { icon: '✓' })
  }, [setConsent, setVisible])

  const handleRejectNonEssential = useCallback(async () => {
    const minimalConsent: ConsentPreferences = {
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
    }
    setSaving(true)
    storeConsent(minimalConsent)
    setConsent(minimalConsent)
    await syncConsentToServer(minimalConsent)
    setSaving(false)
    setVisible(false)
    toast('Seuls les cookies essentiels sont activés', { icon: '🛡️' })
  }, [setConsent, setVisible])

  const handleSaveCustom = useCallback(async () => {
    setSaving(true)
    storeConsent(consent)
    await syncConsentToServer(consent)
    setSaving(false)
    setVisible(false)
    toast('Préférences de cookies sauvegardées', { icon: '✓' })
  }, [consent, setConsent, setVisible])

  const toggleConsent = useCallback((key: keyof ConsentPreferences) => {
    if (key === 'essential') return // Cannot disable essential
    setConsent({ ...consent, [key]: !consent[key] })
  }, [consent, setConsent])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { y: 100, opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6"
          role="dialog"
          aria-label="Consentement aux cookies"
          aria-modal="false"
        >
          <div className="max-w-3xl mx-auto bg-card/95 backdrop-blur-md rounded-xl border border-border shadow-2xl shadow-black/20">
            {/* ─── Header ──────────────────────────────────────── */}
            <div className="flex items-start gap-3 p-4 sm:p-5">
              {/* Icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-0.5">
                <Cookie className="h-4.5 w-4.5 text-emerald-400" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Votre vie privée compte
                  </h3>
                  <button
                    onClick={handleRejectNonEssential}
                    className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Fermer et refuser les cookies non essentiels"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                  Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez accepter ou
                  personnaliser vos préférences.{' '}
                  <a
                    href="/legal/privacy"
                    className="underline text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                  >
                    Politique de confidentialité
                  </a>
                </p>

                {/* ─── Quick Actions ───────────────────────────── */}
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Button
                    onClick={handleAcceptAll}
                    disabled={saving}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm h-8 sm:h-9 shadow-lg shadow-emerald-500/20"
                    size="sm"
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Tout accepter
                  </Button>
                  <Button
                    onClick={handleRejectNonEssential}
                    disabled={saving}
                    variant="outline"
                    className="text-xs sm:text-sm h-8 sm:h-9 border-border"
                    size="sm"
                  >
                    Refuser les non-essentiels
                  </Button>
                  <Button
                    onClick={() => setView(view === 'customize' ? 'simple' : 'customize')}
                    variant="ghost"
                    className="text-xs sm:text-sm h-8 sm:h-9 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    size="sm"
                  >
                    Personnaliser
                    {view === 'customize' ? (
                      <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 ml-1" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* ─── Customize Panel ──────────────────────────── */}
            <AnimatePresence>
              {view === 'customize' && (
                <motion.div
                  initial={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                  animate={prefersReducedMotion ? undefined : { height: 'auto', opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border px-4 sm:px-5 py-3 space-y-3">
                    {(Object.keys(COOKIE_DESCRIPTIONS) as Array<keyof ConsentPreferences>).map((key) => {
                      const { label, description } = COOKIE_DESCRIPTIONS[key]
                      const isEssential = key === 'essential'
                      return (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-foreground">{label}</p>
                              {isEssential && (
                                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  Requis
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                              {description}
                            </p>
                          </div>
                          <Switch
                            checked={consent[key]}
                            onCheckedChange={() => toggleConsent(key)}
                            disabled={isEssential || saving}
                            className="data-[state=checked]:bg-emerald-500 flex-shrink-0"
                            aria-label={`${label} cookies`}
                          />
                        </div>
                      )
                    })}

                    <div className="flex justify-end pt-1">
                      <Button
                        onClick={handleSaveCustom}
                        disabled={saving}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8"
                        size="sm"
                      >
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        Sauvegarder mes choix
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
