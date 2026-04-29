/**
 * 404 Not Found Page — Burozen
 *
 * Professional not-found page with:
 *  - Friendly French messaging
 *  - Emerald/green branding
 *  - Link back to home
 *  - Responsive design
 */

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg">
        {/* 404 Number */}
        <div className="mb-6">
          <span className="text-8xl sm:text-9xl font-bold text-emerald-500/20 select-none">
            404
          </span>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <span className="text-xl font-bold text-emerald-500">B</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
          Page non trouvée
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Oups ! La page que vous cherchez semble introuvable. Elle a peut-être été déplacée,
          supprimée, ou l&apos;adresse est incorrecte.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <Home className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
          <button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-foreground bg-muted rounded-xl hover:bg-muted/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Page précédente
          </button>
        </div>

        {/* Help text */}
        <p className="mt-8 text-xs text-muted-foreground">
          Besoin d&apos;aide ?{' '}
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
