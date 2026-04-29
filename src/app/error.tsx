/**
 * Error Boundary Page — Burozen
 *
 * Catches runtime errors and displays a friendly error page.
 * This is a client component as required by Next.js for error boundaries.
 *
 * Features:
 *  - "Erreur serveur" message
 *  - Retry button (calls reset())
 *  - Link back to home
 *  - Burozen branding (emerald theme)
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RefreshCw, AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Burozen application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg">
        {/* Error icon */}
        <div className="mb-6 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <span className="text-lg font-bold text-emerald-500">B</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
          Erreur serveur
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-2 leading-relaxed">
          Une erreur inattendue s&apos;est produite. Nos équipes ont été notifiées et
          travaillent à résoudre le problème.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-6">
            Référence de l&apos;erreur : {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-foreground bg-muted rounded-xl hover:bg-muted/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <Home className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
        </div>

        {/* Help text */}
        <p className="mt-8 text-xs text-muted-foreground">
          Le problème persiste ?{' '}
          <a
            href="mailto:support@burozen.com"
            className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
          >
            Contactez notre support
          </a>
        </p>
      </div>
    </div>
  )
}
