import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { startOfWeek, endOfWeek, subHours } from 'date-fns'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'Aucun utilisateur' }, { status: 404 })

    const now = new Date()
    const maxDailyHours = user.maxDailyHours || 10

    // Get today's entries
    const todayEntries = await db.timeEntry.findMany({
      where: {
        userId: user.id,
        startTime: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
      orderBy: { startTime: 'desc' },
    })

    // Calculate today's totals
    const todayTotalMinutes = todayEntries.reduce((acc, e) => acc + (e.duration || 0), 0)

    // Check for active running time (no end time on most recent entry)
    const activeEntry = todayEntries.find(e => !e.endTime)
    let activeMinutes = 0
    if (activeEntry) {
      activeMinutes = Math.floor((now.getTime() - activeEntry.startTime.getTime()) / 60000)
    }

    const totalWorkedMinutes = todayTotalMinutes + activeMinutes

    // Check for continuous work without break
    // Look at last 2 hours of entries
    const twoHoursAgo = subHours(now, 2)
    const recentEntries = todayEntries.filter(e => e.startTime >= twoHoursAgo || (e.endTime && e.endTime >= twoHoursAgo))
    const recentMinutes = recentEntries.reduce((acc, e) => {
      const start = e.startTime < twoHoursAgo ? twoHoursAgo : e.startTime
      const end = e.endTime || now
      return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000))
    }, 0)
    const recentMinutesWithActive = recentMinutes + activeMinutes

    // Calculate billable ratio
    const billableMinutes = todayEntries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)
    const billableRatio = todayTotalMinutes > 0 ? billableMinutes / todayTotalMinutes : 1

    // Determine break suggestion
    let shouldBreak = false
    let reason = ''
    let breakType: 'short' | 'long' | 'stop' = 'short'

    if (totalWorkedMinutes >= maxDailyHours * 60) {
      shouldBreak = true
      reason = `Vous avez dépassé ${maxDailyHours}h de travail aujourd'hui. Il est temps de vous arrêter.`
      breakType = 'stop'
    } else if (recentMinutesWithActive >= 120) {
      shouldBreak = true
      reason = 'Vous travaillez depuis plus de 2 heures sans pause. Prenez un moment pour vous ressourcer.'
      breakType = 'long'
    } else if (recentMinutesWithActive >= 90) {
      shouldBreak = true
      reason = 'Vous travaillez depuis 1h30. Une courte pause serait bénéfique.'
      breakType = 'short'
    } else if (billableRatio < 0.5 && todayTotalMinutes > 120) {
      shouldBreak = true
      reason = `Seulement ${Math.round(billableRatio * 100)}% de votre temps est facturable aujourd'hui. Pensez à revoir vos tâches non facturables.`
      breakType = 'short'
    }

    // Get weekly hours for context
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const weekEntries = await db.timeEntry.findMany({
      where: {
        userId: user.id,
        startTime: { gte: weekStart, lte: weekEnd },
      },
    })
    const weeklyMinutes = weekEntries.reduce((acc, e) => acc + (e.duration || 0), 0)

    return NextResponse.json({
      shouldBreak,
      reason,
      breakType,
      workedMinutes: totalWorkedMinutes,
      activeMinutes,
      todayHours: Math.round(todayTotalMinutes / 60 * 100) / 100,
      weeklyHours: Math.round(weeklyMinutes / 60 * 100) / 100,
      billableRatio: Math.round(billableRatio * 100),
      maxDailyHours,
      isTracking: !!activeEntry,
    })
  } catch (error) {
    console.error('Erreur suggestions pause:', error)
    return NextResponse.json({ error: 'Échec de l\'analyse' }, { status: 500 })
  }
}
