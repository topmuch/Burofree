/**
 * Account Health API Route
 *
 * Checks the health of a connected email/calendar account.
 * Returns connection status, token validity, and permission info.
 *
 * GET /api/accounts/health?accountId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getFreshAccessToken } from '@/lib/token-refresh'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId requis' }, { status: 400 })
    }

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const account = await db.emailAccount.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Compte non trouvé' }, { status: 404 })
    }

    const result = {
      isConnected: false,
      tokenValid: false,
      canReadMail: false,
      canSendMail: false,
      canAccessCalendar: false,
      lastChecked: new Date().toISOString(),
    }

    // Get fresh access token
    const provider = account.provider.toLowerCase()
    const normalizedProvider = provider === 'outlook' ? 'outlook' : 'gmail'
    const accessToken = await getFreshAccessToken(user.id, normalizedProvider)

    if (!accessToken) {
      return NextResponse.json(result)
    }

    result.tokenValid = true

    if (provider === 'gmail') {
      try {
        const mailRes = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/profile',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (mailRes.ok) result.canReadMail = true

        const calRes = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (calRes.ok) result.canAccessCalendar = true

        const scopes = account.scopes || ''
        result.canSendMail = scopes.includes('gmail.send') || scopes.includes('mail.google.com')
      } catch {
        // API call failed
      }
    } else if (provider === 'outlook') {
      try {
        const mailRes = await fetch(
          'https://graph.microsoft.com/v1.0/me/messages?$top=1&$select=id',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (mailRes.ok) result.canReadMail = true

        const calRes = await fetch(
          'https://graph.microsoft.com/v1.0/me/calendar',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (calRes.ok) result.canAccessCalendar = true

        const scopes = account.scopes || ''
        result.canSendMail = scopes.includes('Mail.Send') || scopes.includes('Mail.ReadWrite')
      } catch {
        // API call failed
      }
    }

    result.isConnected = result.canReadMail || result.canAccessCalendar

    return NextResponse.json(result)
  } catch (error) {
    console.error('Account health check error:', error)
    return NextResponse.json(
      { error: 'Échec de la vérification de l\'état du compte' },
      { status: 500 }
    )
  }
}
