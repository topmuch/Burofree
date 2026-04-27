/**
 * Focus Timer Logic — Pure-logic Pomodoro timer state manager
 * No React, no DOM dependencies
 */

export interface FocusTimerState {
  status: 'idle' | 'running' | 'paused' | 'break' | 'completed'
  type: 'pomodoro' | 'deep_work' | 'custom'
  durationMinutes: number
  breakMinutes: number
  remainingSeconds: number
  totalSeconds: number
  pausedAt: Date | null
  totalPausedMs: number
  startedAt: Date | null
  currentRound: number
  totalRounds: number
  ambientSound: string | null
}

export interface FocusTimerCallbacks {
  onTick: (remaining: number) => void
  onBreakStart: () => void
  onBreakEnd: () => void
  onComplete: (session: FocusTimerState) => void
  onPaused: () => void
  onResumed: () => void
}

export class FocusTimer {
  private state: FocusTimerState
  private callbacks: Partial<FocusTimerCallbacks>
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastTickAt: number | null = null

  constructor(
    type: FocusTimerState['type'] = 'pomodoro',
    durationMinutes: number = 25,
    breakMinutes: number = 5,
    callbacks: Partial<FocusTimerCallbacks> = {},
    ambientSound: string | null = null,
    totalRounds: number = 4,
  ) {
    this.callbacks = callbacks
    this.state = {
      status: 'idle',
      type,
      durationMinutes,
      breakMinutes,
      remainingSeconds: durationMinutes * 60,
      totalSeconds: durationMinutes * 60,
      pausedAt: null,
      totalPausedMs: 0,
      startedAt: null,
      currentRound: 1,
      totalRounds,
      ambientSound,
    }
  }

  start(): void {
    if (this.state.status !== 'idle' && this.state.status !== 'paused') return
    if (this.state.status === 'idle') {
      this.state.startedAt = new Date()
    } else {
      // Resuming — add pause duration
      if (this.state.pausedAt) {
        this.state.totalPausedMs += Date.now() - this.state.pausedAt.getTime()
        this.state.pausedAt = null
      }
    }
    this.state.status = 'running'
    this.lastTickAt = Date.now()
    this.intervalId = setInterval(() => this.tick(), 1000)
  }

  pause(): void {
    if (this.state.status !== 'running') return
    this.state.status = 'paused'
    this.state.pausedAt = new Date()
    this.stopInterval()
    this.callbacks.onPaused?.()
  }

  stop(): void {
    this.stopInterval()
    this.state.status = 'idle'
    this.state.remainingSeconds = this.state.durationMinutes * 60
    this.state.totalSeconds = this.state.durationMinutes * 60
    this.state.startedAt = null
    this.state.pausedAt = null
    this.state.totalPausedMs = 0
    this.state.currentRound = 1
  }

  skipToBreak(): void {
    if (this.state.status !== 'running') return
    this.state.remainingSeconds = 0
    this.onSessionComplete()
  }

  private tick(): void {
    if (this.state.remainingSeconds <= 0) {
      this.onSessionComplete()
      return
    }
    this.state.remainingSeconds--
    this.callbacks.onTick?.(this.state.remainingSeconds)
  }

  private onSessionComplete(): void {
    this.stopInterval()

    if (this.state.status === 'running') {
      // Focus session complete, start break
      this.state.status = 'completed'
      this.callbacks.onComplete?.({ ...this.state })

      // Auto-start break if not last round
      if (this.state.currentRound < this.state.totalRounds) {
        this.state.status = 'break'
        this.state.remainingSeconds = this.state.breakMinutes * 60
        this.state.totalSeconds = this.state.breakMinutes * 60
        this.callbacks.onBreakStart?.()
        this.lastTickAt = Date.now()
        this.intervalId = setInterval(() => this.tick(), 1000)
      }
    } else if (this.state.status === 'break') {
      // Break complete, start next round
      this.state.currentRound++
      this.state.status = 'idle'
      this.state.remainingSeconds = this.state.durationMinutes * 60
      this.state.totalSeconds = this.state.durationMinutes * 60
      this.callbacks.onBreakEnd?.()
    }
  }

  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getState(): Readonly<FocusTimerState> {
    return { ...this.state }
  }

  destroy(): void {
    this.stopInterval()
  }

  // Page Visibility: pause when tab hidden
  handleVisibilityChange(isVisible: boolean): void {
    if (!isVisible && this.state.status === 'running') {
      this.pause()
    }
  }
}
