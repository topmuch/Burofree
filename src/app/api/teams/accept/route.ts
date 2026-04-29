/**
 * Team Accept Invitation API
 *
 * GET: Accept or decline a team invitation via token
 * (GET for email link compatibility)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { acceptInvitation, declineInvitation } from '@/features/production/teams/invitation-manager'
import { invalidatePermissionCache } from '@/features/security/rbac/checker'
import { z } from 'zod'

const acceptQuerySchema = z.object({
  token: z.string().min(1, 'Le token d\'invitation est requis'),
  action: z.enum(['accept', 'decline']).default('accept'),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const action = searchParams.get('action') || 'accept'

  if (!token) {
    return NextResponse.redirect(new URL('/?error=missing_invite_token', req.url))
  }

  const parsed = acceptQuerySchema.safeParse({ token, action })
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/?error=invalid_invite', req.url))
  }

  // For GET from email, redirect to the app with token in URL
  // The client will handle the actual accept/decline via POST
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return NextResponse.redirect(
    new URL(`/?action=team-invite&token=${encodeURIComponent(token)}&inviteAction=${action}`, origin)
  )
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const schema = z.object({
    token: z.string().min(1),
    action: z.enum(['accept', 'decline']),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { token, action } = parsed.data

  if (action === 'accept') {
    const result = await acceptInvitation(auth.user.id, token)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    // Invalidate permission cache — user's team membership is now active
    invalidatePermissionCache(auth.user.id)
    return NextResponse.json({ success: true, teamId: result.teamId })
  } else {
    const result = await declineInvitation(auth.user.id, token)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    // Invalidate permission cache defensively for decline as well
    invalidatePermissionCache(auth.user.id)
    return NextResponse.json({ success: true })
  }
}
