/**
 * Auth Guard Utility for Burofree API Routes
 * Provides server-side session verification for API route handlers
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  onboardingDone: boolean
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) return null

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        onboardingDone: true,
      },
    })

    return user
  } catch {
    return null
  }
}

/**
 * Require authentication in an API route handler.
 * Returns the user if authenticated, or a 401 response if not.
 *
 * Usage:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const auth = await requireAuth(req)
 *   if (!auth.user) return auth.response!
 *   // ... use auth.user
 * }
 * ```
 */
export async function requireAuth(_req?: NextRequest): Promise<{
  user: AuthenticatedUser | null
  response: NextResponse | null
}> {
  const user = await getAuthUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      ),
    }
  }

  return { user, response: null }
}

/**
 * Require authentication and onboarding completion.
 * Returns 401 if not authenticated, 403 if not onboarded.
 */
export async function requireOnboardedUser(_req?: NextRequest): Promise<{
  user: AuthenticatedUser | null
  response: NextResponse | null
}> {
  const { user, response } = await requireAuth(_req)

  if (!user) return { user: null, response }

  if (!user.onboardingDone) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Onboarding non terminé.', redirectToOnboarding: true },
        { status: 403 }
      ),
    }
  }

  return { user, response: null }
}
