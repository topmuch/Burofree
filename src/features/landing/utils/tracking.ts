/**
 * Marketing Tracking Utilities — Burozen Landing Page
 *
 * Provides consent-aware tracking functions for GA4, Plausible,
 * and development console logging. All functions are client-side only
 * and check consent status before firing analytics events.
 *
 * Supported trackers:
 *  - GA4 (gtag)
 *  - Plausible (window.plausible)
 *  - Console (dev mode fallback)
 */

// ─── Types ─────────────────────────────────────────────────────────────────────────

export type ConsentStatus = 'accepted' | 'refused' | 'unknown'

export interface UTMParams {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
}

interface TrackProperties {
  [key: string]: string | number | boolean | null | undefined
}

// ─── Constants ──────────────────────────────────────────────────────────────────────

const CONSENT_STORAGE_KEY = 'burozen_consent'
const CONSENT_EVENT_NAME = 'burozen:consent_update'

// ─── Consent Management ─────────────────────────────────────────────────────────────

/**
 * Read the current consent status from localStorage.
 * Returns 'unknown' if no consent has been given or if not in browser.
 */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'unknown'

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (stored === 'accepted' || stored === 'refused') return stored
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }

  return 'unknown'
}

/**
 * Store consent status in localStorage and dispatch an update event.
 */
export function setConsentStatus(status: ConsentStatus): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status)
  } catch {
    // Silently fail if localStorage is unavailable
  }

  // Dispatch a custom event so other parts of the app can react
  try {
    window.dispatchEvent(
      new CustomEvent(CONSENT_EVENT_NAME, { detail: { status } }),
    )
  } catch {
    // CustomEvent may not be supported in very old browsers
  }
}

// ─── UTM Parsing ────────────────────────────────────────────────────────────────────

/**
 * Parse UTM parameters from the current page URL.
 * Returns an object with all standard UTM parameters (or null if not present).
 */
export function parseUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)

  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
  }
}

// ─── Core Tracking ──────────────────────────────────────────────────────────────────

/**
 * Fire a custom analytics event.
 * Respects consent: if consent is not 'accepted', only console.log in dev.
 *
 * Priority: GA4 gtag → Plausible → console.log (dev)
 */
export function trackEvent(
  eventName: string,
  properties?: TrackProperties,
): void {
  if (typeof window === 'undefined') return

  const consent = getConsentStatus()
  const isDev = process.env.NODE_ENV === 'development'

  // If consent is not accepted, only log in development
  if (consent !== 'accepted') {
    if (isDev) {
      console.log(`[tracking] (blocked - no consent) ${eventName}`, properties)
    }
    return
  }

  // Try GA4 (gtag)
  const gtag = (window as unknown as Record<string, unknown>).gtag
  if (typeof gtag === 'function') {
    try {
      gtag('event', eventName, properties ?? {})
    } catch (error) {
      console.warn('[tracking] GA4 gtag error:', error)
    }
    return
  }

  // Try Plausible
  const plausible = (window as unknown as Record<string, unknown>).plausible
  if (typeof plausible === 'function') {
    try {
      plausible(eventName, { props: properties })
    } catch (error) {
      console.warn('[tracking] Plausible error:', error)
    }
    return
  }

  // Fallback: console log in development
  if (isDev) {
    console.log(`[tracking] ${eventName}`, properties)
  }
}

// ─── CTA Click Tracking ─────────────────────────────────────────────────────────────

/**
 * Track a CTA (call-to-action) click event.
 * Automatically appends the current page path and UTM data.
 */
export function trackCTAClick(ctaName: string, location: string): void {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...cleanUTMForTracking(),
  })
}

// ─── Scroll Depth Tracking ──────────────────────────────────────────────────────────

/**
 * Set up scroll depth tracking with IntersectionObserver.
 * Fires a trackEvent at each milestone (25%, 50%, 75%, 100%).
 * Returns a cleanup function to remove observers.
 *
 * Uses sentinel elements placed at the corresponding document height percentages.
 * Each milestone fires only once.
 */
export function trackScrollDepth(): () => void {
  if (typeof window === 'undefined') return () => {}

  const milestones = [25, 50, 75, 100]
  const fired = new Set<number>()
  const observers: IntersectionObserver[] = []

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) {
    // Respect accessibility: don't track scroll if user prefers reduced motion
    return () => {}
  }

  for (const percent of milestones) {
    // Create a sentinel element positioned at the percentage height
    const sentinel = document.createElement('div')
    sentinel.setAttribute('data-scroll-milestone', String(percent))
    sentinel.style.cssText = 'position:absolute;width:1px;height:1px;pointer-events:none;visibility:hidden;'

    // Position the sentinel at the target percentage of the document
    const topPx = (document.documentElement.scrollHeight * percent) / 100
    sentinel.style.top = `${topPx}px`

    document.body.appendChild(sentinel)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.has(percent)) {
            fired.add(percent)
            trackEvent('scroll_depth', {
              percent,
              page_path: window.location.pathname,
            })
          }
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0,
      },
    )

    observer.observe(sentinel)
    observers.push(observer)
  }

  // Return cleanup function
  return () => {
    for (const observer of observers) {
      observer.disconnect()
    }
    // Remove sentinel elements
    const sentinels = document.querySelectorAll('[data-scroll-milestone]')
    sentinels.forEach((el) => el.remove())
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────

/**
 * Read current UTM params and clean them for tracking properties.
 * Strips null values so they don't pollute analytics.
 */
function cleanUTMForTracking(): TrackProperties {
  const utm = parseUTMParams()
  const cleaned: TrackProperties = {}

  if (utm.utm_source) cleaned.utm_source = utm.utm_source
  if (utm.utm_medium) cleaned.utm_medium = utm.utm_medium
  if (utm.utm_campaign) cleaned.utm_campaign = utm.utm_campaign
  if (utm.utm_content) cleaned.utm_content = utm.utm_content
  if (utm.utm_term) cleaned.utm_term = utm.utm_term

  return cleaned
}
