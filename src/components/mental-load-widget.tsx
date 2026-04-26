'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, RefreshCw, ChevronRight, Brain, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface MentalLoadFactor {
  name: string
  impact: number
  suggestion: string
}

interface MentalLoadData {
  score: number
  level: 'low' | 'moderate' | 'high' | 'critical'
  factors: MentalLoadFactor[]
  overallAdvice: string
}

interface CoachingData {
  dailyTip: string
  weeklyFocus: string
  habitSuggestion: string
  timeOptimization: string
}

function getScoreColor(score: number): string {
  if (score <= 25) return '#10b981'
  if (score <= 50) return '#eab308'
  if (score <= 75) return '#f97316'
  return '#ef4444'
}

function getScoreColorClass(score: number): { text: string; bg: string; border: string } {
  if (score <= 25) return {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  }
  if (score <= 50) return {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  }
  if (score <= 75) return {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  }
  return {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  }
}

function getLevelLabel(level: string): string {
  switch (level) {
    case 'low': return 'Faible'
    case 'moderate': return 'Modérée'
    case 'high': return 'Élevée'
    case 'critical': return 'Critique'
    default: return level
  }
}

function getLevelIcon(level: string) {
  switch (level) {
    case 'low': return <TrendingDown className="w-4 h-4 text-emerald-400" />
    case 'moderate': return <Minus className="w-4 h-4 text-yellow-400" />
    case 'high': return <TrendingUp className="w-4 h-4 text-orange-400" />
    case 'critical': return <Activity className="w-4 h-4 text-red-400" />
    default: return <Activity className="w-4 h-4" />
  }
}

// Circular gauge component using SVG
function CircularGauge({ score, previousScore }: { score: number; previousScore: number }) {
  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)
  const colorClass = getScoreColorClass(score)

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference - (previousScore / 100) * circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-2xl font-bold ${colorClass.text}`}
          key={score}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

export function MentalLoadWidget() {
  const [data, setData] = useState<MentalLoadData | null>(null)
  const [loading, setLoading] = useState(false)
  const previousScoreRef = useRef(0)
  const [displayPrevScore, setDisplayPrevScore] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadMentalLoad = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/mental-load')
      if (res.ok) {
        const result = await res.json()
        if (result.error) {
          setError(result.error)
        } else {
          setDisplayPrevScore(previousScoreRef.current)
          previousScoreRef.current = result.score
          setData(result)
        }
      } else {
        setError('Erreur lors du chargement')
      }
    } catch {
      setError('Impossible de se connecter')
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/mental-load')
        if (!cancelled && res.ok) {
          const result = await res.json()
          if (result.error) {
            setError(result.error)
          } else {
            previousScoreRef.current = result.score
            setData(result)
          }
        }
      } catch {
        if (!cancelled) setError('Impossible de se connecter')
      }
      if (!cancelled) setLoading(false)
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  if (error && !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400" />
            Charge mentale
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
            onClick={loadMentalLoad}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  const score = data?.score || 0
  const level = data?.level || 'low'
  const colorClass = getScoreColorClass(score)
  const topFactors = (data?.factors || [])
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
  const topSuggestion = topFactors[0]?.suggestion || data?.overallAdvice || ''

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400" />
            Charge mentale
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={loadMentalLoad}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data && loading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Skeleton className="w-[120px] h-[120px] rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <CircularGauge score={score} previousScore={displayPrevScore} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {getLevelIcon(level)}
                  <span className={`text-sm font-semibold ${colorClass.text}`}>
                    {getLevelLabel(level)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {data?.overallAdvice || 'Analyse en cours...'}
                </p>
              </div>
            </div>

            {topFactors.length > 0 && (
              <div className="space-y-2">
                {topFactors.map((factor, i) => (
                  <motion.div
                    key={factor.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getScoreColor(factor.impact * 10) }}
                    />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {factor.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                      {factor.impact}/10
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {topSuggestion && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border ${colorClass.bg} ${colorClass.border}`}
                >
                  <div className="flex items-start gap-2">
                    <ChevronRight className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colorClass.text}`} />
                    <p className="text-xs leading-relaxed">{topSuggestion}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Coaching Tip Card ──────────────────────────────────────────────────────

export function CoachingTipCard() {
  const [data, setData] = useState<CoachingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        const res = await fetch('/api/ai/coaching')
        if (!cancelled && res.ok) {
          const result = await res.json()
          if (!result.error) {
            setData(result)
          }
        }
      } catch {
        // Silently fail
      }
      if (!cancelled) setLoading(false)
    }
    doFetch()
    return () => { cancelled = true }
  }, [])

  if (!data && !loading) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="bg-gradient-to-r from-amber-500/5 to-emerald-500/5 border-amber-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Conseil du jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : data ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">{data.dailyTip}</p>
              {data.timeOptimization && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-amber-400 font-medium">Optimisation:</span> {data.timeOptimization}
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}
