/**
 * GET /api/focus/stats — Focus statistics
 * Returns: total focus hours this week/month, sessions completed, average session length, streak days
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format, subDays, eachDayOfInterval } from 'date-fns'
import { focusStatsRangeSchema } from '@/lib/validations/differentiation'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rlId = getRateLimitIdentifier(req, auth.user.id)
  const rl = checkRateLimit(rlId, DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer.' },
      { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, rl.remaining, rl.retryAfterMs) }
    )
  }

  try {
    // Validate range query param
    const { searchParams } = new URL(req.url)
    const rangeParse = focusStatsRangeSchema.safeParse(searchParams.get('range') || undefined)
    if (!rangeParse.success) {
      return NextResponse.json(
        { error: 'Paramètre range invalide (valeurs: week, month, year)', details: rangeParse.error.flatten() },
        { status: 400 }
      )
    }
    // range is available for future filtering; currently stats return all ranges
    const _range = rangeParse.data

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Week stats
    const weekSessions = await db.focusSession.findMany({
      where: {
        userId: auth.user.id,
        completed: true,
        startedAt: { gte: weekStart, lte: weekEnd },
      },
    })

    // Month stats
    const monthSessions = await db.focusSession.findMany({
      where: {
        userId: auth.user.id,
        completed: true,
        startedAt: { gte: monthStart, lte: monthEnd },
      },
    })

    // Today stats
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todaySessions = await db.focusSession.findMany({
      where: {
        userId: auth.user.id,
        startedAt: { gte: todayStart },
      },
    })

    // Calculate total focus hours
    const weekTotalMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
    const monthTotalMinutes = monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
    const todayTotalMinutes = todaySessions
      .filter(s => s.completed)
      .reduce((sum, s) => sum + s.durationMinutes, 0)

    // Average session length
    const allCompleted = [...weekSessions]
    const avgSessionMinutes = allCompleted.length > 0
      ? Math.round(allCompleted.reduce((sum, s) => sum + s.durationMinutes, 0) / allCompleted.length)
      : 0

    // Calculate streak days (consecutive days with completed sessions)
    const last30Days = eachDayOfInterval({
      start: subDays(now, 29),
      end: now,
    })

    const sessionsByDay = await db.focusSession.findMany({
      where: {
        userId: auth.user.id,
        completed: true,
        startedAt: { gte: subDays(now, 29) },
      },
      select: { startedAt: true },
    })

    const daysWithSessions = new Set(
      sessionsByDay.map(s => format(new Date(s.startedAt), 'yyyy-MM-dd'))
    )

    let streakDays = 0
    for (let i = last30Days.length - 1; i >= 0; i--) {
      const dayStr = format(last30Days[i], 'yyyy-MM-dd')
      if (daysWithSessions.has(dayStr)) {
        streakDays++
      } else if (streakDays > 0) {
        break // Streak broken
      }
    }
    // If no sessions today, check if yesterday started the streak
    if (streakDays === 0 && daysWithSessions.size > 0) {
      const yesterday = format(subDays(now, 1), 'yyyy-MM-dd')
      if (daysWithSessions.has(yesterday)) {
        // Count streak from yesterday
        for (let i = last30Days.length - 2; i >= 0; i--) {
          const dayStr = format(last30Days[i], 'yyyy-MM-dd')
          if (daysWithSessions.has(dayStr)) {
            streakDays++
          } else {
            break
          }
        }
      }
    }

    return NextResponse.json({
      week: {
        totalHours: Math.round((weekTotalMinutes / 60) * 10) / 10,
        sessionsCompleted: weekSessions.length,
      },
      month: {
        totalHours: Math.round((monthTotalMinutes / 60) * 10) / 10,
        sessionsCompleted: monthSessions.length,
      },
      today: {
        totalMinutes: todayTotalMinutes,
        sessionsCompleted: todaySessions.filter(s => s.completed).length,
        sessionsActive: todaySessions.filter(s => !s.completed && !s.endedAt).length,
      },
      avgSessionMinutes,
      streakDays,
    })
  } catch (error) {
    console.error('Focus stats error:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des statistiques' }, { status: 500 })
  }
}
