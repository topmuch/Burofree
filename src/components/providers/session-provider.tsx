'use client'

import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import { useEffect, type ReactNode } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * Inner component that syncs NextAuth session state with the Zustand store.
 * Must be rendered inside NextAuthSessionProvider.
 */
function SessionSync({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const { setUser, fetchUser, fetchAll } = useAppStore.getState()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'authenticated' && session?.user) {
      // Sync auth state to Zustand store
      setUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? null,
        avatar: session.user.image ?? null,
        onboardingDone: session.user.onboardingDone ?? false,
      })

      // If user is authenticated but not onboarded, the page component
      // will handle redirecting to onboarding wizard
      if (session.user.onboardingDone) {
        fetchAll()
      } else {
        fetchUser()
      }
    } else if (status === 'unauthenticated') {
      // Clear user data from store when unauthenticated
      setUser(null)
    }
  }, [session, status, setUser, fetchUser, fetchAll])

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
