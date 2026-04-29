'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { FocusTimer, type FocusTimerState } from './focus-timer'
import { AmbientSoundManager } from './ambient-sounds'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Volume2,
  VolumeX,
  Timer,
  Target,
  Brain,
  Coffee,
  Flame,
  TreePine,
  CloudRain,
  Zap,
  X,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────

type SessionType = 'pomodoro' | 'deep_work' | 'custom'
type AmbientSoundType = 'rain' | 'forest' | 'cafe' | 'fireplace' | 'white_noise'

interface FocusStats {
  todayMinutes: number
  sessionsCompleted: number
  streakDays: number
}

interface SavedSession {
  id: string
  startedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const SESSION_PRESETS: Record<SessionType, { focus: number; break: number; label: string; icon: typeof Timer }> = {
  pomodoro: { focus: 25, break: 5, label: 'Pomodoro', icon: Timer },
  deep_work: { focus: 50, break: 10, label: 'Deep Work', icon: Brain },
  custom: { focus: 25, break: 5, label: 'Personnalisé', icon: Settings2 },
}

const AMBIENT_SOUNDS: { key: AmbientSoundType; emoji: string; label: string; icon: typeof CloudRain }[] = [
  { key: 'rain', emoji: '🌧️', label: 'Pluie', icon: CloudRain },
  { key: 'forest', emoji: '🌲', label: 'Forêt', icon: TreePine },
  { key: 'cafe', emoji: '☕', label: 'Café', icon: Coffee },
  { key: 'fireplace', emoji: '🔥', label: 'Cheminée', icon: Flame },
  { key: 'white_noise', emoji: '⚡', label: 'Bruit blanc', icon: Zap },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getStatusText(state: FocusTimerState): string {
  switch (state.status) {
    case 'running': return 'Focus en cours'
    case 'paused': return 'Pause'
    case 'break': return 'Pause programmée'
    case 'completed': return 'Terminé'
    case 'idle': return 'Prêt'
    default: return ''
  }
}

// ─── SVG Progress Ring Component ──────────────────────────────────────────

function ProgressRing({
  progress,
  size = 260,
  strokeWidth = 6,
}: {
  progress: number // 0-1
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transform -rotate-90"
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#focusGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Gradient definition */}
      <defs>
        <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── Round Indicators Component ───────────────────────────────────────────

function RoundIndicators({
  currentRound,
  totalRounds,
}: {
  currentRound: number
  totalRounds: number
}) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: totalRounds }, (_, i) => {
        const round = i + 1
        const isCurrent = round === currentRound
        const isCompleted = round < currentRound

        return (
          <motion.div
            key={round}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isCompleted
                ? 'bg-emerald-400'
                : isCurrent
                  ? 'bg-emerald-400 ring-2 ring-emerald-400/40'
                  : 'bg-zinc-600'
            }`}
            initial={{ scale: 0.8 }}
            animate={{ scale: isCurrent ? 1.2 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )
      })}
    </div>
  )
}

// ─── Main FocusOverlay Component ──────────────────────────────────────────

export function FocusOverlay() {
  const { focusMode, setFocusMode, tasks, projects } = useAppStore()

  // ─── Timer State ────────────────────────────────────────────────────
  const [sessionType, setSessionType] = useState<SessionType>('pomodoro')
  const [customFocusMin, setCustomFocusMin] = useState(25)
  const [customBreakMin, setCustomBreakMin] = useState(5)
  const [timerState, setTimerState] = useState<FocusTimerState | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // ─── Ambient Sound State ────────────────────────────────────────────
  const [activeSound, setActiveSound] = useState<AmbientSoundType | null>(null)
  const [volume, setVolume] = useState(50)
  const [soundMuted, setSoundMuted] = useState(false)

  // ─── Stats State ────────────────────────────────────────────────────
  const [stats, setStats] = useState<FocusStats>({
    todayMinutes: 0,
    sessionsCompleted: 0,
    streakDays: 0,
  })

  // ─── Settings Panel ─────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false)

  // ─── Refs ───────────────────────────────────────────────────────────
  const timerRef = useRef<FocusTimer | null>(null)
  const soundRef = useRef<AmbientSoundManager | null>(null)
  const savedSessionRef = useRef<SavedSession | null>(null)
  const notificationPermissionRequested = useRef(false)

  // ─── Computed values ────────────────────────────────────────────────
  const focusDuration = sessionType === 'custom' ? customFocusMin : SESSION_PRESETS[sessionType].focus
  const breakDuration = sessionType === 'custom' ? customBreakMin : SESSION_PRESETS[sessionType].break

  const remainingSeconds = timerState?.remainingSeconds ?? focusDuration * 60
  const totalSeconds = timerState?.totalSeconds ?? focusDuration * 60
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0
  const isRunning = timerState?.status === 'running'
  const isPaused = timerState?.status === 'paused'
  const isBreak = timerState?.status === 'break'
  const isCompleted = timerState?.status === 'completed'
  const isIdle = !timerState || timerState.status === 'idle'

  // ─── Available tasks (not done) ─────────────────────────────────────
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])

  // ─── Notification Helper ────────────────────────────────────────────
  const sendNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' })
      }
    }
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if (notificationPermissionRequested.current) return
    notificationPermissionRequested.current = true

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    }
  }, [])

  // ─── Fetch Stats ────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/focus/stats')
      if (res.ok) {
        const data = await res.json()
        setStats({
          todayMinutes: data.today?.totalMinutes ?? 0,
          sessionsCompleted: data.today?.sessionsCompleted ?? 0,
          streakDays: data.streakDays ?? 0,
        })
      }
    } catch (e) {
      console.error('fetchFocusStats:', e)
    }
  }, [])

  // ─── Save Session to API ────────────────────────────────────────────
  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/focus/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: sessionType,
          durationMinutes: focusDuration,
          breakMinutes: breakDuration,
          taskId: selectedTaskId || undefined,
          projectId: selectedProjectId || undefined,
          ambientSound: activeSound,
        }),
      })
      if (res.ok) {
        const session = await res.json()
        savedSessionRef.current = { id: session.id, startedAt: session.startedAt }
      }
    } catch (e) {
      console.error('createSession:', e)
    }
  }, [sessionType, focusDuration, breakDuration, selectedTaskId, selectedProjectId, activeSound])

  const completeSession = useCallback(async () => {
    if (!savedSessionRef.current) return
    try {
      await fetch(`/api/focus/sessions/${savedSessionRef.current.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endedAt: new Date().toISOString(),
          completed: true,
          totalPausedSec: timerRef.current?.getState().totalPausedMs
            ? Math.round(timerRef.current.getState().totalPausedMs / 1000)
            : 0,
        }),
      })
      savedSessionRef.current = null
      await fetchStats()
    } catch (e) {
      console.error('completeSession:', e)
    }
  }, [fetchStats])

  const abandonSession = useCallback(async () => {
    if (!savedSessionRef.current) return
    try {
      await fetch(`/api/focus/sessions/${savedSessionRef.current.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endedAt: new Date().toISOString(),
          completed: false,
          totalPausedSec: timerRef.current?.getState().totalPausedMs
            ? Math.round(timerRef.current.getState().totalPausedMs / 1000)
            : 0,
        }),
      })
      savedSessionRef.current = null
    } catch (e) {
      console.error('abandonSession:', e)
    }
  }, [])

  // ─── Initialize Sound Manager ───────────────────────────────────────
  useEffect(() => {
    soundRef.current = new AmbientSoundManager()
    return () => {
      soundRef.current?.stop()
    }
  }, [])

  // ─── Handle Sound Toggle ────────────────────────────────────────────
  const handleSoundToggle = useCallback(async (sound: AmbientSoundType) => {
    if (!soundRef.current) return

    if (activeSound === sound) {
      soundRef.current.stop()
      setActiveSound(null)
    } else {
      await soundRef.current.play(sound)
      setActiveSound(sound)
      if (soundMuted) {
        setSoundMuted(false)
        soundRef.current.setVolume(volume / 100)
      }
    }
  }, [activeSound, soundMuted, volume])

  // ─── Handle Volume Change ───────────────────────────────────────────
  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const v = newVolume[0]
    setVolume(v)
    if (soundRef.current) {
      if (v === 0) {
        setSoundMuted(true)
        soundRef.current.setVolume(0)
      } else {
        setSoundMuted(false)
        soundRef.current.setVolume(v / 100)
      }
    }
  }, [])

  // ─── Toggle Mute ────────────────────────────────────────────────────
  const handleToggleMute = useCallback(() => {
    if (!soundRef.current) return
    if (soundMuted) {
      setSoundMuted(false)
      soundRef.current.setVolume(volume / 100)
    } else {
      setSoundMuted(true)
      soundRef.current.setVolume(0)
    }
  }, [soundMuted, volume])

  // ─── Handle Start ───────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    await requestNotificationPermission()

    // Destroy existing timer if any
    timerRef.current?.destroy()

    const timer = new FocusTimer(
      sessionType,
      focusDuration,
      breakDuration,
      {
        onTick: (remaining) => {
          const state = timer.getState()
          setTimerState({ ...state, remainingSeconds: remaining })
        },
        onBreakStart: () => {
          const state = timer.getState()
          setTimerState({ ...state })
          sendNotification(
            'Pause commencée !',
            'Prenez une pause, vous l\'avez méritée.'
          )
          toast('Pause commencée !', { icon: '☕' })
        },
        onBreakEnd: () => {
          const state = timer.getState()
          setTimerState({ ...state })
          sendNotification(
            'Pause terminée !',
            'Prêt pour la prochaine session ?'
          )
          toast('Pause terminée ! Prêt pour la prochaine session ?', { icon: '🎯' })
        },
        onComplete: (state) => {
          setTimerState({ ...state })
          sendNotification(
            'Session focus terminée !',
            'Prenez une pause.'
          )
          toast('Session focus terminée ! Prenez une pause.', { icon: '🎉' })
          completeSession()
        },
        onPaused: () => {
          const state = timer.getState()
          setTimerState({ ...state })
        },
        onResumed: () => {
          const state = timer.getState()
          setTimerState({ ...state })
        },
      },
      activeSound,
      4,
    )

    timerRef.current = timer
    timer.start()
    setTimerState(timer.getState())
    createSession()
  }, [
    sessionType, focusDuration, breakDuration, activeSound,
    requestNotificationPermission, sendNotification, completeSession, createSession,
  ])

  // ─── Handle Play/Pause Toggle ───────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (!timerRef.current) return

    const state = timerRef.current.getState()
    if (state.status === 'idle') {
      handleStart()
    } else if (state.status === 'running') {
      timerRef.current.pause()
    } else if (state.status === 'paused') {
      timerRef.current.start()
    } else if (state.status === 'completed' || state.status === 'break') {
      // Start a new session after completion or break end
      handleStart()
    }
  }, [handleStart])

  // ─── Handle Stop ────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (!timerRef.current) return
    const state = timerRef.current.getState()
    if (state.status !== 'idle') {
      abandonSession()
    }
    timerRef.current.stop()
    setTimerState(null)
    soundRef.current?.stop()
    setActiveSound(null)
  }, [abandonSession])

  // ─── Handle Skip to Break ───────────────────────────────────────────
  const handleSkipToBreak = useCallback(() => {
    if (!timerRef.current) return
    timerRef.current.skipToBreak()
  }, [])

  // ─── Handle Exit ────────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    handleStop()
    setFocusMode(false)
  }, [handleStop, setFocusMode])

  // ─── F12 Keyboard Shortcut ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        const newMode = !focusMode
        setFocusMode(newMode)
        if (newMode) {
          toast('Mode focus activé', { icon: '🎯' })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusMode, setFocusMode])

  // ─── Page Visibility API ────────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      const isVisible = document.visibilityState === 'visible'
      if (timerRef.current) {
        timerRef.current.handleVisibilityChange(isVisible)
        if (!isVisible) {
          const state = timerRef.current.getState()
          setTimerState({ ...state })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ─── Fetch stats on mount & when overlay opens ──────────────────────
  useEffect(() => {
    if (!focusMode) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/focus/stats')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setStats({
            todayMinutes: data.today?.totalMinutes ?? 0,
            sessionsCompleted: data.today?.sessionsCompleted ?? 0,
            streakDays: data.streakDays ?? 0,
          })
        }
      } catch (e) {
        console.error('fetchFocusStats:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [focusMode])

  // ─── Cleanup timer on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      timerRef.current?.destroy()
    }
  }, [])

  // ─── Format Today's Focus Time ──────────────────────────────────────
  const todayFocusDisplay = useMemo(() => {
    const h = Math.floor(stats.todayMinutes / 60)
    const m = stats.todayMinutes % 60
    if (h === 0) return `${m}min`
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
  }, [stats.todayMinutes])

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {focusMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Semi-transparent dark overlay */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Main Focus Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg mx-4"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-emerald-950/90 via-zinc-900/95 to-zinc-950/95 shadow-2xl shadow-emerald-900/20 overflow-hidden">
              {/* ─── Header ──────────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-400">Mode Focus</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    onClick={handleExit}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* ─── Timer Display ───────────────────────────────── */}
              <div className="flex flex-col items-center py-4">
                {/* Progress Ring + Timer */}
                <div className="relative flex items-center justify-center">
                  <ProgressRing progress={isIdle ? 0 : progress} size={240} strokeWidth={5} />

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      key={remainingSeconds}
                      className="text-6xl font-mono font-bold text-white tracking-wider"
                      initial={{ scale: 1.02, opacity: 0.9 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      {formatMMSS(remainingSeconds)}
                    </motion.span>

                    {/* Status text */}
                    <span className={`text-sm mt-1 font-medium ${
                      isRunning ? 'text-emerald-400' :
                      isPaused ? 'text-amber-400' :
                      isBreak ? 'text-sky-400' :
                      isCompleted ? 'text-emerald-400' :
                      'text-zinc-500'
                    }`}>
                      {timerState ? getStatusText(timerState) : 'Prêt'}
                    </span>

                    {/* Round indicators */}
                    {timerState && timerState.totalRounds > 1 && (
                      <div className="mt-2">
                        <RoundIndicators
                          currentRound={timerState.currentRound}
                          totalRounds={timerState.totalRounds}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Controls ──────────────────────────────────── */}
                <div className="flex items-center gap-3 mt-4">
                  {/* Stop Button */}
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isIdle}
                      onClick={handleStop}
                      className="h-10 w-10 p-0 rounded-full border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 bg-transparent disabled:opacity-30"
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  </motion.div>

                  {/* Play/Pause Button */}
                  <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handlePlayPause}
                      className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      {isRunning ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-0.5" />
                      )}
                    </Button>
                  </motion.div>

                  {/* Skip to Break Button */}
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isRunning}
                      onClick={handleSkipToBreak}
                      className="h-10 w-10 p-0 rounded-full border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 bg-transparent disabled:opacity-30"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* ─── Settings Panel (collapsible) ──────────────── */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 space-y-4 border-t border-white/5 pt-4">
                      {/* Session Type Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Type de session</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.keys(SESSION_PRESETS) as SessionType[]).map((type) => {
                            const preset = SESSION_PRESETS[type]
                            const Icon = preset.icon
                            return (
                              <motion.button
                                key={type}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSessionType(type)}
                                disabled={!isIdle}
                                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                                  sessionType === type
                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <Icon className="w-4 h-4" />
                                {preset.label}
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Custom Duration Sliders */}
                      {sessionType === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-zinc-400 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-emerald-400" />
                                Focus
                              </label>
                              <span className="text-xs text-emerald-400 font-mono">{customFocusMin} min</span>
                            </div>
                            <Slider
                              value={[customFocusMin]}
                              min={5}
                              max={120}
                              step={5}
                              onValueChange={(v) => setCustomFocusMin(v[0])}
                              disabled={!isIdle}
                              className="[&_[data-slot=slider-track]]:bg-zinc-800 [&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-zinc-400 flex items-center gap-1.5">
                                <Coffee className="w-3.5 h-3.5 text-sky-400" />
                                Pause
                              </label>
                              <span className="text-xs text-sky-400 font-mono">{customBreakMin} min</span>
                            </div>
                            <Slider
                              value={[customBreakMin]}
                              min={1}
                              max={30}
                              step={1}
                              onValueChange={(v) => setCustomBreakMin(v[0])}
                              disabled={!isIdle}
                              className="[&_[data-slot=slider-track]]:bg-zinc-800 [&_[data-slot=slider-range]]:bg-sky-500 [&_[data-slot=slider-thumb]]:border-sky-500"
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Task & Project Selectors */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-zinc-400">Tâche</label>
                          <Select
                            value={selectedTaskId}
                            onValueChange={setSelectedTaskId}
                            disabled={!isIdle}
                          >
                            <SelectTrigger className="h-8 text-xs bg-zinc-900/50 border-zinc-800 text-zinc-300 w-full">
                              <SelectValue placeholder="Aucune tâche" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 max-h-48">
                              <ScrollArea className="max-h-44">
                                <SelectItem value="none" className="text-xs text-zinc-500">Aucune tâche</SelectItem>
                                {activeTasks.map(t => (
                                  <SelectItem key={t.id} value={t.id} className="text-xs text-zinc-300">
                                    {t.title}
                                  </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-zinc-400">Projet</label>
                          <Select
                            value={selectedProjectId}
                            onValueChange={setSelectedProjectId}
                            disabled={!isIdle}
                          >
                            <SelectTrigger className="h-8 text-xs bg-zinc-900/50 border-zinc-800 text-zinc-300 w-full">
                              <SelectValue placeholder="Aucun projet" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 max-h-48">
                              <ScrollArea className="max-h-44">
                                <SelectItem value="none" className="text-xs text-zinc-500">Aucun projet</SelectItem>
                                {projects.map(p => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs text-zinc-300">
                                    <span className="flex items-center gap-2">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: p.color || '#10b981' }}
                                      />
                                      {p.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Ambient Sounds ───────────────────────────────── */}
              <div className="px-6 pb-3">
                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-zinc-400">Sons d&apos;ambiance</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleMute}
                      className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    >
                      {soundMuted || volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Sound Buttons */}
                  <div className="flex items-center gap-2 mb-3">
                    {AMBIENT_SOUNDS.map((sound) => (
                      <motion.button
                        key={sound.key}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSoundToggle(sound.key)}
                        className={`flex flex-col items-center gap-1 py-2 px-2.5 rounded-lg border text-xs font-medium transition-all min-w-[3.5rem] ${
                          activeSound === sound.key
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10'
                            : 'border-zinc-800 bg-zinc-900/30 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-base leading-none">{sound.emoji}</span>
                        <span className="text-[10px] leading-tight">{sound.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <Slider
                      value={[soundMuted ? 0 : volume]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={handleVolumeChange}
                      className="flex-1 [&_[data-slot=slider-track]]:bg-zinc-800 [&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3"
                    />
                    <span className="text-[10px] text-zinc-600 font-mono min-w-[28px] text-right">
                      {soundMuted ? '0' : volume}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Stats Summary ──────────────────────────────── */}
              <div className="px-6 pb-5">
                <div className="border-t border-white/5 pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.03]">
                      <span className="text-lg font-semibold text-white">{todayFocusDisplay}</span>
                      <span className="text-[10px] text-zinc-500">Focus aujourd&apos;hui</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.03]">
                      <span className="text-lg font-semibold text-white">{stats.sessionsCompleted}</span>
                      <span className="text-[10px] text-zinc-500">Sessions</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.03]">
                      <span className="text-lg font-semibold text-white">{stats.streakDays}</span>
                      <span className="text-[10px] text-zinc-500">Jours consécutifs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Footer Hint ─────────────────────────────────── */}
              <div className="px-6 pb-4">
                <p className="text-center text-[10px] text-zinc-600">
                  Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[9px]">F12</kbd> pour activer/désactiver le mode focus
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
