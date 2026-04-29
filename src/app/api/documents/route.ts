import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (projectId) where.projectId = projectId
    if (type) where.type = type
    if (search) where.name = { contains: search }

    const documents = await db.document.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Documents GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const document = await db.document.create({
      data: {
        name: body.name,
        type: body.type,
        content: body.content,
        fileUrl: body.fileUrl,
        mimeType: body.mimeType,
        size: body.size,
        projectId: body.projectId || null,
        userId: user.id,
      },
      include: { project: true },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Documents POST error:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
