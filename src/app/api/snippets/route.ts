import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (category) where.category = category

    const snippets = await db.snippet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(snippets)
  } catch (error) {
    console.error('Snippets GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const snippet = await db.snippet.create({
      data: {
        title: body.title,
        content: body.content,
        category: body.category || 'other',
        userId: user.id,
      },
    })

    return NextResponse.json(snippet, { status: 201 })
  } catch (error) {
    console.error('Snippets POST error:', error)
    return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 })
  }
}
