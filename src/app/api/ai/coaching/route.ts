import { NextResponse } from 'next/server'
import { createAIEngine, type CoachingContext } from '@/lib/ai'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1) // Monday
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const [
      completedTasksThisWeek,
      timeEntriesThisWeek,
      overdueTasks,
      tasksDueToday,
      unreadEmails,
      activeProjects,
      lastWeekCompletedTasks,
    ] = await Promise.all([
      // Completed tasks this week
      db.task.count({
        where: { userId: user.id, completedAt: { gte: weekStart } },
      }),
      // Time entries this week
      db.timeEntry.findMany({
        where: { userId: user.id, startTime: { gte: weekStart } },
      }),
      // Overdue tasks
      db.task.count({
        where: { userId: user.id, dueDate: { lt: today }, status: { not: 'done' } },
      }),
      // Tasks due today
      db.task.count({
        where: { userId: user.id, dueDate: { gte: new Date(todayStr), lt: new Date(todayStr + 'T23:59:59') }, status: { not: 'done' } },
      }),
      // Unread emails
      db.email.count({
        where: { userId: user.id, isRead: false, isSent: false },
      }),
      // Active projects
      db.project.count({
        where: { userId: user.id, status: 'active' },
      }),
      // Last week completed tasks (for trend)
      db.task.count({
        where: {
          userId: user.id,
          completedAt: {
            gte: new Date(weekStart.getTime() - 7 * 86400000),
            lt: weekStart,
          },
        },
      }),
    ])

    // Calculate hours
    const totalHoursThisWeek = timeEntriesThisWeek.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600
    const billableHoursThisWeek = timeEntriesThisWeek.filter(e => e.isBillable).reduce((sum, e) => sum + (e.duration || 0), 0) / 3600

    // Determine productivity trend
    let recentProductivityTrend: CoachingContext['recentProductivityTrend'] = 'stable'
    if (completedTasksThisWeek > lastWeekCompletedTasks * 1.2) {
      recentProductivityTrend = 'improving'
    } else if (completedTasksThisWeek < lastWeekCompletedTasks * 0.8) {
      recentProductivityTrend = 'declining'
    }

    // Determine top pain point
    let topPainPoint = 'Aucun problème majeur identifié'
    if (overdueTasks > 5) topPainPoint = 'Trop de tâches en retard'
    else if (unreadEmails > 15) topPainPoint = 'Boîte email surchargée'
    else if (overdueTasks > 0 && tasksDueToday > 3) topPainPoint = 'Surcharge de travail immédiat'
    else if (billableHoursThisWeek / Math.max(totalHoursThisWeek, 1) < 0.5) topPainPoint = 'Ratio heures facturables trop bas'
    else if (overdueTasks > 0) topPainPoint = 'Retards sur certaines tâches'

    // Get mental load score (quick calculation)
    let mentalLoadScore = 0
    mentalLoadScore += Math.min(overdueTasks * 8, 30)
    mentalLoadScore += Math.min(tasksDueToday * 3, 15)
    mentalLoadScore += Math.min(unreadEmails > 5 ? (unreadEmails - 5) * 2 : 0, 15)
    mentalLoadScore += Math.min(activeProjects > 4 ? (activeProjects - 4) * 5 : 0, 15)
    mentalLoadScore += Math.min(totalHoursThisWeek > 45 ? (totalHoursThisWeek - 45) * 3 : 0, 15)
    mentalLoadScore = Math.min(mentalLoadScore, 100)

    let mentalLoadLevel = 'low'
    if (mentalLoadScore > 75) mentalLoadLevel = 'critical'
    else if (mentalLoadScore > 50) mentalLoadLevel = 'high'
    else if (mentalLoadScore > 25) mentalLoadLevel = 'moderate'

    const context: CoachingContext = {
      userName: user.name || 'Freelancer',
      assistantName: user.assistantName,
      assistantTone: user.assistantTone,
      completedTasksThisWeek,
      totalHoursThisWeek: Math.round(totalHoursThisWeek * 10) / 10,
      billableHoursThisWeek: Math.round(billableHoursThisWeek * 10) / 10,
      overdueTasks,
      tasksDueToday,
      unreadEmails,
      activeProjects,
      mentalLoadScore,
      mentalLoadLevel,
      topPainPoint,
      recentProductivityTrend,
    }

    const engine = createAIEngine()
    const advice = await engine.generateCoachingAdvice(context)

    return NextResponse.json(advice)
  } catch (error) {
    console.error('Coaching advice error:', error)
    return NextResponse.json({ error: 'Failed to generate coaching advice' }, { status: 500 })
  }
}
