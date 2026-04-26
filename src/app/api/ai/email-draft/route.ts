import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
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

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Tu es ${user.assistantName}, l'assistant de ${user.name}, un freelancer. Génère un brouillon de réponse email professionnel. Ton: ${tone || user.assistantTone}. Sois concis mais poli. Réponds en français. Format JSON: {"subject": "sujet", "body": "corps du message"}`
        },
        {
          role: 'user',
          content: context
            ? `Contexte: ${context}\n\nGénère un email adapté.`
            : `Génère une réponse à cet email:\nSujet: ${emailSubject}\nContenu: ${emailContent.substring(0, 500)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 400,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const draft = JSON.parse(jsonMatch[0])
      return NextResponse.json({ draft })
    }

    return NextResponse.json({ draft: { subject: 'Re: ' + emailSubject, body: responseText } })
  } catch (error) {
    console.error('Email draft error:', error)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
