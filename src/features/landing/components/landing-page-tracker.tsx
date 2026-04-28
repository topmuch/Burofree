'use client'

/**
 * Landing Page Tracker — Client component that initializes tracking hooks
 *
 * This component renders nothing visible. It mounts the useScrollDepth
 * and useUTM hooks so they run on the client side when the landing page loads.
 * Separating tracking into its own client component avoids marking
 * the entire landing page as a client component.
 */

import { useScrollDepth } from '../utils/use-scroll-depth'

export function LandingPageTracker() {
  useScrollDepth()
  return null
}
