import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.category !== undefined) updateData.category = body.category

    const snippet = await db.snippet.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(snippet)
  } catch (error) {
    console.error('Snippet PUT error:', error)
    return NextResponse.json({ error: 'Failed to update snippet' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.snippet.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Snippet DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete snippet' }, { status: 500 })
  }
}
