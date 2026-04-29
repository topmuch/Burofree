import { NextRequest, NextResponse } from 'next/server'
import { createAIEngine } from '@/lib/ai'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { emailId, tone, context } = await req.json()
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    let emailContent = ''
    let emailSubject = ''

    if (emailId) {
      const email = await db.email.findUnique({ where: { id: emailId } })
      if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
      emailContent = email.body || email.snippet || ''
      emailSubject = email.subject
    }

    const engine = createAIEngine()
    const draft = await engine.generateEmailDraft(
      emailContent,
      tone || user.assistantTone,
      context,
      user.name || 'Freelancer',
      user.assistantName,
      emailSubject,
    )

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Email draft error:', error)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
