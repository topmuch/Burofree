import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      onboardingDone?: boolean
    }
    emailAccounts?: {
      id: string
      provider: string
      email: string
      isPrimary: boolean
      tokenExpiry: string | null
      scopes: string | null
    }[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string | null
    refreshToken?: string | null
    provider?: string | null
    accessTokenExpires?: number | null
    userId?: string
    role?: string
    suspended?: boolean
  }
}
