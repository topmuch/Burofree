/**
 * InstallPrompt — Smart PWA install prompt component
 *
 * Shows after 2 meaningful interactions or 30 seconds of session.
 * Detects platform (iOS vs Android/Desktop) for appropriate guidance.
 * Dismissible with 7-day cooldown.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePWA } from './use-pwa'

const STORAGE_KEY = 'burozen-install-prompt'
const INTERACTION_KEY = 'burozen-interactions'
const COOLDOWN_DAYS = 7

function getInstallState(): { dismissed: boolean; dismissedAt: number | null } {
  if (typeof window === 'undefined') return { dismissed: false, dismissedAt: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dismissed: false, dismissedAt: null }
    return JSON.parse(raw)
  } catch {
    return { dismissed: false, dismissedAt: null }
  }
}

function isCooldownActive(): boolean {
  const { dismissedAt } = getInstallState()
  if (!dismissedAt) return false
  const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - dismissedAt < cooldownMs
}

function getInteractionCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(localStorage.getItem(INTERACTION_KEY) || '0', 10)
  } catch {
    return 0
  }
}

function incrementInteraction(): number {
  if (typeof window === 'undefined') return 0
  try {
    const count = getInteractionCount() + 1
    localStorage.setItem(INTERACTION_KEY, String(count))
    return count
  } catch {
    return 0
  }
}

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export function InstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const platform = detectPlatform()

  const checkShouldShow = useCallback(() => {
    if (isInstalled) return false
    if (isCooldownActive()) return false

    const interactionCount = getInteractionCount()
    // Show after 2 interactions OR 30 seconds
    if (interactionCount >= 2) return true

    return false
  }, [isInstalled])

  // Track interactions
  useEffect(() => {
    if (isInstalled || isCooldownActive()) return

    const handler = () => {
      const count = incrementInteraction()
      if (count >= 2 && !showPrompt) {
        const shouldShow = platform === 'ios'
          ? !window.matchMedia('(display-mode: standalone)').matches
          : canInstall
        if (shouldShow) setShowPrompt(true)
      }
    }

    // Listen for clicks as meaningful interactions
    window.addEventListener('click', handler, { once: false })
    return () => window.removeEventListener('click', handler)
  }, [isInstalled, canInstall, showPrompt, platform])

  // 30-second timer fallback
  useEffect(() => {
    if (isInstalled || isCooldownActive()) return

    const timer = setTimeout(() => {
      const shouldShow = platform === 'ios'
        ? !window.matchMedia('(display-mode: standalone)').matches
        : canInstall
      if (shouldShow) setShowPrompt(true)
    }, 30000)

    return () => clearTimeout(timer)
  }, [isInstalled, canInstall, platform])

  const handleInstall = async () => {
    if (platform === 'ios') {
      setShowIosInstructions(true)
      return
    }

    const accepted = await promptInstall()
    if (accepted) {
      setShowPrompt(false)
    }
  }

  const handleDismiss = (permanent: boolean = false) => {
    setShowPrompt(false)
    if (permanent) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dismissed: true,
        dismissedAt: Date.now(),
      }))
    }
  }

  // Don't render if installed or cooldown active
  if (isInstalled || isCooldownActive()) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
        >
          <Card className="bg-zinc-900 border-zinc-700 shadow-2xl shadow-black/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-emerald-500/20 p-2">
                  {platform === 'ios' ? (
                    <Smartphone className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Download className="h-5 w-5 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Installer Burozen
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    {platform === 'ios' ? (
                      'Accédez à Burozen depuis votre écran d\'accueil pour une expérience optimale.'
                    ) : (
                      'Installez l\'application pour un accès rapide et le mode hors-ligne.'
                    )}
                  </p>

                  {showIosInstructions && (
                    <div className="mt-2 rounded-md bg-zinc-800 p-2 text-xs text-zinc-300">
                      <p>1. Appuyez sur <strong>l\'icône de partage</strong> en bas de l\'écran</p>
                      <p>2. Sélectionnez <strong>&quot;Sur l\'écran d\'accueil&quot;</strong></p>
                      <p>3. Appuyez sur <strong>&quot;Ajouter&quot;</strong></p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      {platform === 'ios' ? 'Voir les instructions' : 'Installer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(false)}
                      className="text-zinc-400 hover:text-zinc-300 text-xs"
                    >
                      Plus tard
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(true)}
                      className="text-zinc-500 hover:text-zinc-400 text-xs"
                    >
                      Ne plus demander
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(false)}
                  className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
