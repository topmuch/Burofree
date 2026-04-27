import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const isDefault = searchParams.get('isDefault')
    const search = searchParams.get('search')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (type) where.type = type
    if (category) where.category = category
    if (isDefault !== null) where.isDefault = isDefault === 'true'
    if (search) where.name = { contains: search }

    const templates = await db.template.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.name || !body.type || !body.content) {
      return NextResponse.json(
        { error: 'name, type, and content are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Extract variable names from content using {variable_name} pattern
    const variablePattern = /\{(\w+)\}/g
    const extractedVariables: string[] = []
    let match: RegExpExecArray | null
    while ((match = variablePattern.exec(body.content)) !== null) {
      if (!extractedVariables.includes(match[1])) {
        extractedVariables.push(match[1])
      }
    }

    // Use provided variables or extracted ones
    const variables = body.variables
      ? (typeof body.variables === 'string' ? body.variables : JSON.stringify(body.variables))
      : JSON.stringify(extractedVariables)

    const template = await db.template.create({
      data: {
        name: body.name,
        description: body.description || null,
        type: body.type,
        content: body.content,
        variables,
        category: body.category || 'general',
        icon: body.icon || null,
        isDefault: body.isDefault || false,
        usageCount: 0,
        userId: user.id,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Templates POST error:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
