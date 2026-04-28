'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

const STORAGE_KEY = 'burofree-theme'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(getInitialTheme())
    setMounted(true)
  }, [])

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
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

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
