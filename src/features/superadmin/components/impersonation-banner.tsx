'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface ImpersonationState {
  isActive: boolean
  targetEmail: string | null
  sessionId: string | null
  expiresAt: number | null // Unix timestamp in ms
}

/* ─── Constants ────────────────────────────────────────────────────────────── */

const MAX_DURATION_MS = 15 * 60 * 1000 // 15 minutes

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState>({
    isActive: false,
    targetEmail: null,
    sessionId: null,
    expiresAt: null,
  })
  const [remaining, setRemaining] = useState<number>(0)
  const [ending, setEnding] = useState(false)

  /* ── Check Impersonation Status ──────────────────────────────────────────── */

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/impersonation/status')
      if (res.ok) {
        const json = await res.json()
        setState({
          isActive: json.isActive ?? false,
          targetEmail: json.targetEmail ?? null,
          sessionId: json.sessionId ?? null,
          expiresAt: json.expiresAt ? new Date(json.expiresAt).getTime() : null,
        })
      }
    } catch {
      // Silently ignore — banner simply won't appear
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30_000) // re-check every 30s
    return () => clearInterval(interval)
  }, [checkStatus])

  /* ── Countdown Timer ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!state.isActive || !state.expiresAt) {
      setRemaining(0)
      return
    }

    const tick = () => {
      const left = state.expiresAt! - Date.now()
      setRemaining(Math.max(0, left))
      if (left <= 0) {
        setState((prev) => ({ ...prev, isActive: false }))
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [state.isActive, state.expiresAt])

  /* ── End Impersonation ───────────────────────────────────────────────────── */

  const endImpersonation = async () => {
    if (!state.sessionId) return
    setEnding(true)
    try {
      const res = await fetch('/api/superadmin/impersonation/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId }),
      })
      if (res.ok) {
        setState({ isActive: false, targetEmail: null, sessionId: null, expiresAt: null })
        // Reload to reset the session context
        window.location.reload()
      }
    } catch (err) {
      console.error('Erreur fin impersonation :', err)
    } finally {
      setEnding(false)
    }
  }

  /* ── Progress color ──────────────────────────────────────────────────────── */

  const progressPercent = state.expiresAt
    ? Math.max(0, Math.min(100, (remaining / MAX_DURATION_MS) * 100))
    : 0

  const timerColor =
    remaining < 60_000
      ? 'text-red-400'
      : remaining < 3 * 60_000
        ? 'text-amber-400'
        : 'text-amber-200'

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <AnimatePresence>
      {state.isActive && state.targetEmail && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div className="bg-amber-500 border-b border-amber-600 shadow-lg shadow-amber-500/20">
            {/* Progress bar */}
            <div
              className="h-1 bg-amber-300 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />

            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <ShieldAlert className="size-5 text-amber-900 shrink-0" />
                <span className="text-sm font-semibold text-amber-950">
                  Mode Superadmin — Vous agissez en tant que{' '}
                  <span className="font-mono underline underline-offset-2">{state.targetEmail}</span>
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Countdown */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-mono font-bold ${timerColor}`}>
                    {formatCountdown(remaining)}
                  </span>
                  <span className="text-xs text-amber-800/70">restant</span>
                </div>

                {/* End Button */}
                <Button
                  size="sm"
                  onClick={endImpersonation}
                  disabled={ending}
                  className="bg-amber-700 text-amber-100 hover:bg-amber-800 border-amber-600 shadow-none"
                >
                  <X className="mr-1 size-3" />
                  Terminer l&apos;impersonation
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
