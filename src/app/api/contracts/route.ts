import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }
    if (status) where.status = status
    if (type) where.type = type
    if (projectId) where.projectId = projectId
    if (search) where.title = { contains: search }

    const contracts = await db.contract.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Contracts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.title || !body.clientName) {
      return NextResponse.json(
        { error: 'title and clientName are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const contract = await db.contract.create({
      data: {
        title: body.title,
        description: body.description || null,
        type: body.type || 'service',
        status: body.status || 'draft',
        clientName: body.clientName,
        clientEmail: body.clientEmail || null,
        clientAddress: body.clientAddress || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        value: body.value ?? null,
        currency: body.currency || 'EUR',
        terms: body.terms || null,
        notes: body.notes || null,
        fileUrl: body.fileUrl || null,
        projectId: body.projectId || null,
        userId: user.id,
      },
      include: { project: true },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error('Contracts POST error:', error)
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}
