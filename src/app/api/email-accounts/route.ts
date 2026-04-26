import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { email: 'alex@freelance.dev', name: 'Alex Martin' },
      })
    }

    const accounts = await db.emailAccount.findMany({
      where: { userId: user.id },
      orderBy: { isPrimary: 'desc' },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching email accounts:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des comptes email' }, { status: 500 })
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

    const account = await db.emailAccount.create({
      data: {
        provider: body.provider,
        email: body.email,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        imapHost: body.imapHost,
        imapPort: body.imapPort,
        smtpHost: body.smtpHost,
        smtpPort: body.smtpPort,
        isPrimary: body.isPrimary || false,
        userId: user.id,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Error creating email account:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'ajout du compte email' }, { status: 500 })
  }
}
