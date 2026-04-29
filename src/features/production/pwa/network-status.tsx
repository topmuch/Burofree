'use client'

/**
 * NetworkStatus — Offline/Online status banner component
 *
 * Shows a persistent banner when offline and a brief
 * success banner when the connection is restored.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { usePWA } from './use-pwa'

export function NetworkStatus() {
  const { isOnline, syncStatus, queueCount } = usePWA()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-amber-600/95 backdrop-blur-sm"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-white text-sm">
            <WifiOff className="h-4 w-4" />
            <span>
              Vous êtes hors-ligne — vos actions seront synchronisées au retour du réseau
            </span>
            {queueCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-800 px-2 py-0.5 text-xs font-medium">
                {queueCount} en attente
              </span>
            )}
          </div>
        </motion.div>
      )}

      {isOnline && syncStatus === 'syncing' && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600/95 backdrop-blur-sm"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-white text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Synchronisation en cours...</span>
          </div>
        </motion.div>
      )}

      {isOnline && syncStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={() => {
            // Auto-hide after animation
          }}
          className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600/95 backdrop-blur-sm"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-white text-sm">
            <Wifi className="h-4 w-4" />
            <span>Connexion rétablie — synchronisation terminée</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
