import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filter = searchParams.get('filter')

    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const where: Record<string, unknown> = { userId: user.id }
    if (filter === 'unread') where.isRead = false
    if (filter === 'starred') where.isStarred = true
    if (filter === 'sent') where.isSent = true

    const [emails, total] = await Promise.all([
      db.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.email.count({ where }),
    ])

    return NextResponse.json({ emails, total, page, limit })
  } catch (error) {
    console.error('Error fetching emails:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des emails' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const emailAccount = await db.emailAccount.findFirst({
      where: { userId: user.id, isPrimary: true },
    })

    if (!emailAccount) {
      return NextResponse.json({ error: 'Aucun compte email configuré' }, { status: 400 })
    }

    const email = await db.email.create({
      data: {
        fromAddress: emailAccount.email,
        fromName: user.name,
        toAddress: body.to,
        subject: body.subject,
        body: body.body,
        snippet: body.body?.substring(0, 100),
        isRead: true,
        isSent: true,
        receivedAt: new Date(),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    })

    return NextResponse.json(email, { status: 201 })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 })
  }
}
