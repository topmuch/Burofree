import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const where: Record<string, unknown> = { userId: user.id }

    // Apply filter
    if (filter) {
      switch (filter) {
        case 'unread':
          where.isRead = false
          break
        case 'starred':
          where.isStarred = true
          break
        case 'sent':
          where.isSent = true
          break
        case 'client':
        case 'admin':
        case 'newsletter':
          where.category = filter
          break
        case 'all':
        default:
          break
      }
    }

    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { fromName: { contains: search } },
        { fromAddress: { contains: search } },
      ]
    }

    const [emails, total] = await Promise.all([
      db.email.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.email.count({ where }),
    ])

    return NextResponse.json({ emails, total })
  } catch (error) {
    console.error('Emails GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Find the email account to use
    let emailAccountId = body.emailAccountId
    if (!emailAccountId) {
      const primaryAccount = await db.emailAccount.findFirst({
        where: { userId: user.id, isPrimary: true },
      })
      if (!primaryAccount) return NextResponse.json({ error: 'No email account configured' }, { status: 400 })
      emailAccountId = primaryAccount.id
    }

    const emailAccount = await db.emailAccount.findUnique({
      where: { id: emailAccountId },
    })
    if (!emailAccount) return NextResponse.json({ error: 'Email account not found' }, { status: 404 })

    const email = await db.email.create({
      data: {
        fromAddress: emailAccount.email,
        fromName: user.name,
        toAddress: body.toAddress,
        subject: body.subject,
        body: body.body,
        snippet: body.body?.substring(0, 100),
        isSent: true,
        category: 'client',
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    })

    return NextResponse.json(email, { status: 201 })
  } catch (error) {
    console.error('Emails POST error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
