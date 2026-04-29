/**
 * useScrollDepth — React hook for scroll depth tracking
 *
 * Tracks scroll depth milestones (25%, 50%, 75%, 100%) and fires
 * trackEvent('scroll_depth', { percent: N }) at each milestone.
 *
 * Features:
 *  - Uses scroll event with requestAnimationFrame throttle (more reliable than
 *    IntersectionObserver for scroll depth on dynamic pages)
 *  - Fires each milestone only once
 *  - Respects prefers-reduced-motion
 *  - Checks consent before tracking
 *  - Cleans up on unmount
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { trackEvent, getConsentStatus } from './tracking'

// ─── Types & Constants ──────────────────────────────────────────────────────────────

const MILESTONES = [25, 50, 75, 100] as const
type Milestone = (typeof MILESTONES)[number]

const THROTTLE_MS = 200 // Throttle scroll handler to ~5 checks/sec

// ─── Hook ───────────────────────────────────────────────────────────────────────────

export function useScrollDepth(): void {
  const firedRef = useRef<Set<Milestone>>(new Set())
  const rafRef = useRef<number | null>(null)
  const lastCheckRef = useRef<number>(0)

  const getScrollPercent = useCallback((): number => {
    if (typeof window === 'undefined') return 0

    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const docHeight = document.documentElement.scrollHeight - window.innerHeight

    if (docHeight <= 0) return 0

    return Math.min(Math.round((scrollTop / docHeight) * 100), 100)
  }, [])

  const checkMilestones = useCallback(() => {
    const consent = getConsentStatus()
    if (consent !== 'accepted') return

    const percent = getScrollPercent()

    for (const milestone of MILESTONES) {
      if (percent >= milestone && !firedRef.current.has(milestone)) {
        firedRef.current.add(milestone)
        trackEvent('scroll_depth', {
          percent: milestone,
          page_path: window.location.pathname,
        })
      }
    }
  }, [getScrollPercent])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleScroll = () => {
      const now = Date.now()

      // Throttle: skip if we checked too recently
      if (now - lastCheckRef.current < THROTTLE_MS) {
        // Schedule a check after the throttle window if we haven't already
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            lastCheckRef.current = Date.now()
            checkMilestones()
            rafRef.current = null
          })
        }
        return
      }

      lastCheckRef.current = now

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      rafRef.current = requestAnimationFrame(() => {
        checkMilestones()
        rafRef.current = null
      })
    }

    // Also check on initial load (user might already be scrolled)
    checkMilestones()

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [checkMilestones])
}
