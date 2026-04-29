'use client'

import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import { useEffect, type ReactNode } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * Inner component that syncs NextAuth session state with the Zustand store.
 * Must be rendered inside NextAuthSessionProvider.
 *
 * IMPORTANT: When unauthenticated (e.g. OAuth not configured), we do NOT
 * override the user from the Zustand store. The page.tsx fetchUser() logic
 * handles loading the user from the local DB directly.
 */
function SessionSync({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'authenticated' && session?.user) {
      const { setUser, fetchUser, fetchAll } = useAppStore.getState()

      // Sync auth state to Zustand store
      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name ?? null,
        avatar: session.user.image ?? null,
        onboardingDone: (session.user as { onboardingDone?: boolean }).onboardingDone ?? false,
      })

      // If user is authenticated but not onboarded, the page component
      // will handle redirecting to onboarding wizard
      if ((session.user as { onboardingDone?: boolean }).onboardingDone) {
        fetchAll()
      } else {
        fetchUser()
      }
    }
    // When unauthenticated, do NOT set user to null — let the
    // page.tsx fetchUser() handle local DB users. This prevents
    // a race condition where SessionSync overwrites the DB user.
  }, [session, status])

  return <>{children}</>
}

interface SessionProviderProps {
  children: ReactNode
}

/**
 * Session Provider wrapper that:
 * - Wraps the app with NextAuth SessionProvider
 * - Syncs auth state to the Zustand store
 * - Handles session loading states
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <SessionSync>{children}</SessionSync>
    </NextAuthSessionProvider>
  )
}
