import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.target !== undefined) updateData.target = body.target
    if (body.current !== undefined) updateData.current = body.current
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.weekStart !== undefined) updateData.weekStart = new Date(body.weekStart)
    if (body.weekEnd !== undefined) updateData.weekEnd = new Date(body.weekEnd)
    if (body.completed !== undefined) updateData.completed = body.completed

    const goal = await db.weeklyGoal.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Goal PUT error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.weeklyGoal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Goal DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
