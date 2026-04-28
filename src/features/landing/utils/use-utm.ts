/**
 * useUTM — React hook for UTM parameter persistence
 *
 * Reads UTM parameters from the current URL on first load,
 * persists them to localStorage with a 30-day expiry,
 * and returns the current UTM params (from URL or localStorage).
 *
 * Used by the lead form to automatically attach UTM data to submissions.
 */

'use client'

import { useState, useCallback } from 'react'
import { parseUTMParams, type UTMParams } from './tracking'

// ─── Constants ──────────────────────────────────────────────────────────────────────

const UTM_STORAGE_KEY = 'burozen_utm'
const UTM_EXPIRY_DAYS = 30

interface StoredUTM extends UTMParams {
  _storedAt: number // Unix timestamp in ms
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────

/**
 * Check if stored UTM data has expired.
 */
function isExpired(storedAt: number): boolean {
  const now = Date.now()
  const expiryMs = UTM_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  return now - storedAt > expiryMs
}

/**
 * Read stored UTM data from localStorage.
 * Returns null if not found, expired, or in SSR.
 */
function readStoredUTM(): StoredUTM | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY)
    if (!raw) return null

    const parsed: StoredUTM = JSON.parse(raw)

    // Validate structure
    if (!parsed._storedAt || isExpired(parsed._storedAt)) {
      localStorage.removeItem(UTM_STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Persist UTM data to localStorage with a timestamp.
 */
function writeStoredUTM(utm: UTMParams): void {
  if (typeof window === 'undefined') return

  // Only store if there's at least one UTM param
  const hasUTM = Object.values(utm).some((v) => v != null && v !== '')
  if (!hasUTM) return

  try {
    const stored: StoredUTM = {
      ...utm,
      _storedAt: Date.now(),
    }
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // localStorage may be full or unavailable
  }
}

/**
 * Merge URL UTM params with stored UTM params.
 * URL params take precedence over stored params.
 */
function mergeUTM(urlUTM: UTMParams, storedUTM: StoredUTM | null): UTMParams {
  const merged: UTMParams = {
    utm_source: urlUTM.utm_source ?? storedUTM?.utm_source ?? null,
    utm_medium: urlUTM.utm_medium ?? storedUTM?.utm_medium ?? null,
    utm_campaign: urlUTM.utm_campaign ?? storedUTM?.utm_campaign ?? null,
    utm_content: urlUTM.utm_content ?? storedUTM?.utm_content ?? null,
    utm_term: urlUTM.utm_term ?? storedUTM?.utm_term ?? null,
  }

  // Strip nulls to get a clean object
  return merged
}

// ─── Hook ───────────────────────────────────────────────────────────────────────────

export interface UseUTMReturn {
  /** Current UTM params (URL overrides localStorage) */
  utm: UTMParams
  /** Whether there are any active UTM params */
  hasUTM: boolean
  /** Manually clear stored UTM data (e.g., after submission) */
  clearUTM: () => void
}

export function useUTM(): UseUTMReturn {
  const [utm, setUtm] = useState<UTMParams>(() => {
    // 1. Read UTM params from the URL
    const urlUTM = parseUTMParams()

    // 2. Read stored UTM params from localStorage
    const storedUTM = readStoredUTM()

    // 3. If URL has UTM params, store them (refresh the expiry)
    const hasURLUTM = Object.values(urlUTM).some((v) => v != null && v !== '')
    if (hasURLUTM) {
      writeStoredUTM(urlUTM)
    }

    // 4. Merge: URL takes precedence over stored
    return mergeUTM(urlUTM, storedUTM)
  })

  const hasUTM = Object.values(utm).some((v) => v != null && v !== '')

  const clearUTM = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(UTM_STORAGE_KEY)
    } catch {
      // Silently fail
    }
    setUtm({})
  }, [])

  return { utm, hasUTM, clearUTM }
}
