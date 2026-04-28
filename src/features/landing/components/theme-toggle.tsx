'use client'

import { useSyncExternalStore, useEffect, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

const STORAGE_KEY = 'maellis-theme'

type Theme = 'light' | 'dark'

// ─── useSyncExternalStore adapters ──────────────────────────────────────

function subscribeToTheme(callback: () => void): () => void {
  window.addEventListener('storage', callback)
  window.addEventListener('maellis-theme-change', callback)
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('maellis-theme-change', callback)
    mql.removeEventListener('change', callback)
  }
}

function getThemeSnapshot(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function getThemeServerSnapshot(): Theme {
  return 'dark'
}

// ─── Mounted detection via useSyncExternalStore ─────────────────────────

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

// ─── Component ──────────────────────────────────────────────────────────

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot)
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  // Apply theme class to <html> and persist to localStorage
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.classList.add('theme-transition')
    localStorage.setItem(STORAGE_KEY, theme)

    const timeout = setTimeout(() => {
      root.classList.remove('theme-transition')
    }, 300)

    return () => clearTimeout(timeout)
  }, [theme, mounted])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, newTheme)
    // Dispatch custom event so useSyncExternalStore re-reads the snapshot
    window.dispatchEvent(new CustomEvent('maellis-theme-change'))
  }, [theme])

  if (!mounted) {
    return (
      <button
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card"
        aria-label="Changer le thème"
      >
        <span className="sr-only">Changer le thème</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-colors"
      aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-zinc-200" />
      ) : (
        <Moon className="h-4 w-4 text-zinc-700" />
      )}
    </button>
  )
}
