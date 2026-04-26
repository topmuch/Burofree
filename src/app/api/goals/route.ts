import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const weekStart = searchParams.get('weekStart')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (weekStart) where.weekStart = { gte: new Date(weekStart) }

    const goals = await db.weeklyGoal.findMany({
      where,
      orderBy: { weekStart: 'desc' },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Goals GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const goal = await db.weeklyGoal.create({
      data: {
        title: body.title,
        target: body.target,
        current: body.current || 0,
        unit: body.unit || 'tasks',
        weekStart: new Date(body.weekStart),
        weekEnd: new Date(body.weekEnd),
        userId: user.id,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Goals POST error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
