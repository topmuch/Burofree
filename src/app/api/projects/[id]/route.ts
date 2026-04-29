import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.clientName !== undefined) updateData.clientName = body.clientName
    if (body.color !== undefined) updateData.color = body.color
    if (body.status !== undefined) updateData.status = body.status
    if (body.budget !== undefined) updateData.budget = body.budget
    if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null

    const project = await db.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Project PUT error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Project DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
