import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { startOfWeek, endOfWeek, format, parseISO, isWithinInterval } from 'date-fns'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'Aucun utilisateur' }, { status: 404 })

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    // Fetch all time entries for this week
    const entries = await db.timeEntry.findMany({
      where: {
        userId: user.id,
        startTime: { gte: weekStart, lte: weekEnd },
      },
      include: { project: true },
    })

    // Calculate totals
    const trackedMinutes = entries.reduce((acc, e) => acc + (e.duration || 0), 0)
    const billableEntries = entries.filter(e => e.isBillable)
    const billableMinutes = billableEntries.reduce((acc, e) => acc + (e.duration || 0), 0)

    const hourlyRate = user.hourlyRate || 0
    const revenue = (billableMinutes / 60) * hourlyRate
    const targetHours = user.weeklyTargetHours || 35
    const targetRevenue = user.weeklyTargetRevenue || (targetHours * hourlyRate)
    const percentageProgress = targetHours > 0 ? Math.min((billableMinutes / 60) / targetHours * 100, 100) : 0

    // Daily breakdown (Mon-Sun)
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + i)
      const dayStr = format(day, 'yyyy-MM-dd')

      const dayEntries = entries.filter(e => {
        try {
          return format(parseISO(e.startTime.toISOString()), 'yyyy-MM-dd') === dayStr
        } catch {
          return false
        }
      })

      const dayTotalMinutes = dayEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
      const dayBillableMinutes = dayEntries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)

      return {
        day: dayNames[i],
        date: dayStr,
        totalHours: Math.round(dayTotalMinutes / 60 * 100) / 100,
        billableHours: Math.round(dayBillableMinutes / 60 * 100) / 100,
      }
    })

    // Project breakdown
    const projectMap = new Map<string, { name: string; color: string; totalMinutes: number; billableMinutes: number }>()
    for (const entry of entries) {
      const projId = entry.projectId || '_none'
      const existing = projectMap.get(projId) || { name: entry.project?.name || 'Sans projet', color: entry.project?.color || '#71717a', totalMinutes: 0, billableMinutes: 0 }
      existing.totalMinutes += entry.duration || 0
      if (entry.isBillable) existing.billableMinutes += entry.duration || 0
      projectMap.set(projId, existing)
    }

    const projectBreakdown = Array.from(projectMap.entries()).map(([id, data]) => ({
      projectId: id === '_none' ? null : id,
      projectName: data.name,
      projectColor: data.color,
      totalHours: Math.round(data.totalMinutes / 60 * 100) / 100,
      billableHours: Math.round(data.billableMinutes / 60 * 100) / 100,
      revenue: Math.round(data.billableMinutes / 60 * hourlyRate * 100) / 100,
    }))

    return NextResponse.json({
      targetHours,
      targetRevenue,
      trackedHours: Math.round(trackedMinutes / 60 * 100) / 100,
      billableHours: Math.round(billableMinutes / 60 * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      percentageProgress: Math.round(percentageProgress * 10) / 10,
      hourlyRate,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      dailyBreakdown,
      projectBreakdown,
    })
  } catch (error) {
    console.error('Erreur objectifs facturation:', error)
    return NextResponse.json({ error: 'Échec du chargement des objectifs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'Aucun utilisateur' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (body.targetHours !== undefined) updateData.weeklyTargetHours = Number(body.targetHours)
    if (body.targetRevenue !== undefined) updateData.weeklyTargetRevenue = Number(body.targetRevenue)
    if (body.hourlyRate !== undefined) updateData.hourlyRate = Number(body.hourlyRate)

    const updated = await db.user.update({
      where: { id: user.id },
      data: updateData,
    })

    return NextResponse.json({
      targetHours: updated.weeklyTargetHours,
      targetRevenue: updated.weeklyTargetRevenue,
      hourlyRate: updated.hourlyRate,
    })
  } catch (error) {
    console.error('Erreur mise à jour objectifs:', error)
    return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 500 })
  }
}
