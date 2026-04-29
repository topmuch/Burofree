/**
 * Loading Page — Burozen
 *
 * Global loading state displayed during route transitions.
 * Features:
 *  - Burozen logo animation (pulsing emerald)
 *  - "Chargement..." text
 *  - Skeleton bars for visual feedback
 *  - Responsive design
 */

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6">
        {/* Animated Logo */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Outer pulse ring */}
            <div
              className="absolute inset-0 w-16 h-16 rounded-2xl bg-emerald-500/20 animate-ping"
              aria-hidden="true"
            />
            {/* Inner logo */}
            <div className="relative w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center animate-pulse">
              <span className="text-2xl font-bold text-emerald-500">M</span>
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground animate-pulse">
            Chargement...
          </p>
          <p className="text-xs text-muted-foreground">
            Préparation de votre espace Burozen
          </p>
        </div>

        {/* Skeleton bars */}
        <div className="space-y-2 w-48 mx-auto" aria-hidden="true">
          <div className="h-2 rounded-full bg-muted animate-pulse w-full" />
          <div className="h-2 rounded-full bg-muted animate-pulse w-3/4" />
          <div className="h-2 rounded-full bg-muted animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  )
}
