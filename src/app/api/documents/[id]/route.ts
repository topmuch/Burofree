import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.content !== undefined) updateData.content = body.content
    if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl
    if (body.mimeType !== undefined) updateData.mimeType = body.mimeType
    if (body.size !== undefined) updateData.size = body.size
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null

    const document = await db.document.update({
      where: { id },
      data: updateData,
      include: { project: true },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Document PUT error:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.document.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
