import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const template = await db.template.findFirst({
      where: { id, userId: user.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Verify ownership
    const existing = await db.template.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // If content changed, re-extract variables
    const newContent = body.content ?? existing.content
    const variablePattern = /\{(\w+)\}/g
    const extractedVariables: string[] = []
    let match: RegExpExecArray | null
    while ((match = variablePattern.exec(newContent)) !== null) {
      if (!extractedVariables.includes(match[1])) {
        extractedVariables.push(match[1])
      }
    }

    // Use provided variables, or re-extracted ones if content changed
    let variables: string
    if (body.variables) {
      variables = typeof body.variables === 'string'
        ? body.variables
        : JSON.stringify(body.variables)
    } else if (body.content) {
      variables = JSON.stringify(extractedVariables)
    } else {
      variables = existing.variables
    }

    const template = await db.template.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        type: body.type ?? existing.type,
        content: newContent,
        variables,
        category: body.category ?? existing.category,
        icon: body.icon !== undefined ? body.icon : existing.icon,
        isDefault: body.isDefault ?? existing.isDefault,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template PUT error:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Verify ownership
    const existing = await db.template.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    await db.template.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
