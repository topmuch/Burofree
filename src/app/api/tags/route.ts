import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (category) where.category = category
    if (search) where.name = { contains: search }

    const tags = await db.tag.findMany({
      where,
      include: {
        _count: {
          select: {
            taskTags: true,
            emailTags: true,
            documentTags: true,
            projectTags: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Tags GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    const name = body.name.trim()

    // Validate name uniqueness per user
    const existing = await db.tag.findFirst({
      where: { userId: user.id, name },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Tag "${name}" already exists` },
        { status: 409 }
      )
    }

    const validCategories = ['urgent', 'client', 'status', 'billing', 'custom', 'general']
    const category = validCategories.includes(body.category) ? body.category : 'general'

    const tag = await db.tag.create({
      data: {
        name,
        color: body.color || '#10b981',
        icon: body.icon || null,
        category,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            taskTags: true,
            emailTags: true,
            documentTags: true,
            projectTags: true,
          },
        },
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Tags POST error:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}
