/**
 * GET /api/superadmin/impersonation/status
 * Check if the current session is an impersonation session.
 * Used by the ImpersonationBanner to show/hide itself.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ isActive: false })
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ isActive: false })
    }

    // Check for active impersonation session where this user is the target
    const activeSession = await db.impersonationSession.findFirst({
      where: {
        targetUserId: user.id,
        endedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!activeSession) {
      return NextResponse.json({ isActive: false })
    }

    // Get admin email for display
    const admin = await db.user.findUnique({
      where: { id: activeSession.adminUserId },
      select: { email: true },
    })

    return NextResponse.json({
      isActive: true,
      targetEmail: session.user.email,
      adminEmail: admin?.email || null,
      sessionId: activeSession.token,
      expiresAt: activeSession.expiresAt.toISOString(),
    })
  } catch {
    return NextResponse.json({ isActive: false })
  }
}
