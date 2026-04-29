import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const meeting = await db.meeting.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Meeting GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.location !== undefined) updateData.location = body.location
    if (body.meetingUrl !== undefined) updateData.meetingUrl = body.meetingUrl
    if (body.type !== undefined) updateData.type = body.type
    if (body.status !== undefined) updateData.status = body.status
    if (body.agenda !== undefined) updateData.agenda = body.agenda
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null

    const meeting = await db.meeting.update({
      where: { id },
      data: updateData,
      include: { project: true },
    })

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Meeting PUT error:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.meeting.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Meeting DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}
