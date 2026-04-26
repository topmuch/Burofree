import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const accounts = await db.emailAccount.findMany({
      where: { userId: user.id },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Email accounts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch email accounts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // If this is set as primary, unset other primary accounts
    if (body.isPrimary) {
      await db.emailAccount.updateMany({
        where: { userId: user.id, isPrimary: true },
        data: { isPrimary: false },
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
    console.error('Email accounts POST error:', error)
    return NextResponse.json({ error: 'Failed to create email account' }, { status: 500 })
  }
}
