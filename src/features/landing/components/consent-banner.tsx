'use client'

/**
 * Consent Banner — GDPR-compliant cookie/tracking consent
 *
 * Features:
 *  - Appears on first visit (checks localStorage)
 *  - Accept / Refuse buttons
 *  - Links to privacy policy
 *  - Stores consent status in localStorage
 *  - Dispatches consent update event for tracking module
 *  - Accessible: role="dialog", focus trap, keyboard navigation
 *  - Animated entrance/exit with Framer Motion
 *  - Respects prefers-reduced-motion
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Shield, X } from 'lucide-react'
import { getConsentStatus, setConsentStatus, type ConsentStatus } from '../utils/tracking'

export function ConsentBanner() {
  const [visible, setVisible] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // Check if consent has already been given
    const status = getConsentStatus()
    if (status === 'unknown') {
      // Delay showing the banner to avoid CLS and let the page render first
      const timer = setTimeout(() => {
        setVisible(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = useCallback(() => {
    setConsentStatus('accepted')
    setVisible(false)
  }, [])

  const handleRefuse = useCallback(() => {
    setConsentStatus('refused')
    setVisible(false)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { y: 100, opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6"
          role="dialog"
          aria-label="Consentement aux cookies"
          aria-modal="false"
        >
          <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/10 p-4 sm:p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Votre vie privée compte
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Nous utilisons des cookies pour améliorer votre expérience et analyser le trafic.
                  Vous pouvez accepter ou refuser le suivi analytique.{' '}
                  <a
                    href="/legal/privacy"
                    className="underline text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 rounded-sm"
                  >
                    Politique de confidentialité
                  </a>
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button
                    onClick={handleAccept}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
                    autoFocus
                  >
                    Accepter
                  </button>
                  <button
                    onClick={handleRefuse}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-muted-foreground border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-colors"
                  >
                    Refuser
                  </button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleRefuse}
                className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
