import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'week'
    const projectId = searchParams.get('projectId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const formatType = searchParams.get('format') || 'json'

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'Aucun utilisateur' }, { status: 404 })

    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'year':
        startDate = startOfYear(now)
        endDate = endOfYear(now)
        break
      case 'custom':
        startDate = startDateParam ? new Date(startDateParam) : startOfWeek(now, { weekStartsOn: 1 })
        endDate = endDateParam ? new Date(endDateParam) : endOfWeek(now, { weekStartsOn: 1 })
        break
      default: // week
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        endDate = endOfWeek(now, { weekStartsOn: 1 })
    }

    // Build where clause
    const where: Record<string, unknown> = {
      userId: user.id,
      startTime: { gte: startDate, lte: endDate },
    }
    if (projectId) where.projectId = projectId

    const entries = await db.timeEntry.findMany({
      where,
      include: { project: true, task: true },
      orderBy: { startTime: 'asc' },
    })

    // Calculate totals
    const totalMinutes = entries.reduce((acc, e) => acc + (e.duration || 0), 0)
    const billableMinutes = entries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)
    const hourlyRate = user.hourlyRate || 0
    const revenue = (billableMinutes / 60) * hourlyRate
    const avgHourlyRate = billableMinutes > 0 ? revenue / (billableMinutes / 60) : 0

    // Aggregation based on period
    const aggregation: { label: string; totalHours: number; billableHours: number; revenue: number }[] = []

    if (period === 'week') {
      // Daily aggregation
      const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
      for (let i = 0; i < 7; i++) {
        const day = new Date(startDate)
        day.setDate(day.getDate() + i)
        const dayStr = format(day, 'yyyy-MM-dd')

        const dayEntries = entries.filter(e => {
          try {
            return format(e.startTime, 'yyyy-MM-dd') === dayStr
          } catch {
            return false
          }
        })

        const dayTotal = dayEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
        const dayBillable = dayEntries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)

        aggregation.push({
          label: dayNames[i],
          totalHours: Math.round(dayTotal / 60 * 100) / 100,
          billableHours: Math.round(dayBillable / 60 * 100) / 100,
          revenue: Math.round(dayBillable / 60 * hourlyRate * 100) / 100,
        })
      }
    } else if (period === 'month') {
      // Weekly aggregation
      const weekStart = new Date(startDate)
      let weekNum = 1
      while (weekStart <= endDate) {
        const weekEndDate = new Date(weekStart)
        weekEndDate.setDate(weekEndDate.getDate() + 6)
        const clampedWeekEnd = weekEndDate > endDate ? endDate : weekEndDate

        const weekEntries = entries.filter(e => {
          return e.startTime >= weekStart && e.startTime <= clampedWeekEnd
        })

        const weekTotal = weekEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
        const weekBillable = weekEntries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)

        aggregation.push({
          label: `S${weekNum}`,
          totalHours: Math.round(weekTotal / 60 * 100) / 100,
          billableHours: Math.round(weekBillable / 60 * 100) / 100,
          revenue: Math.round(weekBillable / 60 * hourlyRate * 100) / 100,
        })

        weekStart.setDate(weekStart.getDate() + 7)
        weekNum++
      }
    } else {
      // Monthly aggregation
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(now.getFullYear(), m, 1)
        const monthEnd = new Date(now.getFullYear(), m + 1, 0)

        if (monthStart > endDate || monthEnd < startDate) continue

        const monthEntries = entries.filter(e => {
          return e.startTime >= monthStart && e.startTime <= monthEnd
        })

        const monthTotal = monthEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
        const monthBillable = monthEntries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0)

        aggregation.push({
          label: months[m],
          totalHours: Math.round(monthTotal / 60 * 100) / 100,
          billableHours: Math.round(monthBillable / 60 * 100) / 100,
          revenue: Math.round(monthBillable / 60 * hourlyRate * 100) / 100,
        })
      }
    }

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
      percentage: totalMinutes > 0 ? Math.round(data.totalMinutes / totalMinutes * 100) : 0,
    }))

    const result = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      billableHours: Math.round(billableMinutes / 60 * 100) / 100,
      nonBillableHours: Math.round((totalMinutes - billableMinutes) / 60 * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
      totalEntries: entries.length,
      projectBreakdown,
      aggregation,
    }

    // CSV format
    if (formatType === 'csv') {
      const csvLines: string[] = []
      csvLines.push('Date,Début,Fin,Durée (min),Facturable,Projet,Description')
      for (const entry of entries) {
        const date = format(entry.startTime, 'yyyy-MM-dd')
        const start = format(entry.startTime, 'HH:mm')
        const end = entry.endTime ? format(entry.endTime, 'HH:mm') : ''
        const dur = entry.duration || 0
        const bill = entry.isBillable ? 'Oui' : 'Non'
        const proj = entry.project?.name || 'Sans projet'
        const desc = (entry.description || '').replace(/,/g, ';')
        csvLines.push(`${date},${start},${end},${dur},${bill},${proj},${desc}`)
      }
      const csvContent = csvLines.join('\n')
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rapport-temps-${period}.csv"`,
        },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur rapports temps:', error)
    return NextResponse.json({ error: 'Échec du chargement du rapport' }, { status: 500 })
  }
}
