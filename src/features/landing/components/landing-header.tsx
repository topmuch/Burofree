'use client'

/**
 * Landing Header — Sticky navigation for the marketing landing page
 *
 * Features:
 *  - Transparent on scroll top, solid bg on scroll
 *  - Logo + brand name
 *  - Desktop navigation links (Fonctionnalités, Tarifs, FAQ)
 *  - CTA buttons (Connexion, Commencer gratuitement)
 *  - Theme toggle
 *  - Mobile hamburger menu with slide-down panel
 *  - Scroll-aware background transition
 *  - Accessible: keyboard nav, ARIA labels, focus management
 *  - Prefetch /app route on hover
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Menu, X, ArrowRight } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { trackCTAClick } from '../utils/tracking'

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'Témoignages', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
] as const

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const handleCTAClick = useCallback((ctaName: string) => {
    trackCTAClick(ctaName, 'header')
  }, [])

  const handleNavClick = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm'
          : 'bg-transparent'
      }`}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 rounded-sm"
            aria-label="Burofree — Page d'accueil"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Buro<span className="text-emerald-500">free</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/app"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 rounded-lg"
              prefetch={true}
            >
              Connexion
            </Link>
            <Link
              href="/app"
              onClick={() => handleCTAClick('header_cta')}
              className="group inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
              prefetch={true}
            >
              Commencer
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden"
            role="menu"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={handleNavClick}
                  className="block px-3 py-3 text-base font-medium text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  role="menuitem"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <Link
                  href="/app"
                  onClick={handleNavClick}
                  className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-center"
                  role="menuitem"
                  prefetch={true}
                >
                  Connexion
                </Link>
                <Link
                  href="/app"
                  onClick={() => {
                    handleCTAClick('mobile_header_cta')
                    handleNavClick()
                  }}
                  className="block px-3 py-3 text-base font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors text-center shadow-lg shadow-emerald-500/20"
                  role="menuitem"
                  prefetch={true}
                >
                  Commencer gratuitement
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
