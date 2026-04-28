import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_AUTH_OPTIONS } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

// Token refresh helpers
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

async function refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string } | null> {
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID || '',
        client_secret: process.env.AZURE_AD_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'openid email profile Mail.Read Mail.Send Calendars.ReadWrite offline_access',
      }),
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function refreshOAuthToken(provider: string, refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
  refreshToken?: string
} | null> {
  let result: { access_token: string; expires_in: number; refresh_token?: string } | null = null

  if (provider === 'google') {
    result = await refreshGoogleToken(refreshToken)
  } else if (provider === 'azure-ad') {
    result = await refreshMicrosoftToken(refreshToken)
  }

  if (!result) return null

  return {
    accessToken: result.access_token,
    expiresIn: result.expires_in,
    refreshToken: result.refresh_token,
  }
}

// Check if Google OAuth is properly configured
const isGoogleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const isAzureConfigured = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)

export const authOptions: NextAuthOptions = {
  providers: [
    ...(isGoogleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          }),
        ]
      : []),
    ...(isAzureConfigured
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: 'common',
            authorization: {
              params: {
                scope: 'openid email profile Mail.Read Mail.Send Calendars.ReadWrite offline_access',
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      id: 'credentials',
      name: 'Connexion locale',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
        mode: { label: 'Mode', type: 'text' }, // 'login' or 'register'
      },
      async authorize(credentials, req) {
        if (!credentials?.email) return null

        const email = credentials.email.trim().toLowerCase()

        // Rate limiting: check before processing
        const requestObj = new Request(req?.headers?.origin || 'http://localhost:3000', {
          headers: req?.headers as HeadersInit || {},
        })
        const rateLimitId = getRateLimitIdentifier(requestObj, email)
        const rateCheck = checkRateLimit(rateLimitId, DEFAULT_AUTH_OPTIONS)

        if (!rateCheck.allowed) {
          throw new Error('Trop de tentatives. Veuillez réessayer dans quelques minutes.')
        }

        const mode = credentials.mode || 'login'

        if (mode === 'register') {
          // --- REGISTRATION ---
          const password = credentials.password
          if (!password || password.length < 6) {
            throw new Error('Le mot de passe doit contenir au moins 6 caractères.')
          }

          // Check if user already exists
          const existingUser = await db.user.findUnique({ where: { email } })
          if (existingUser) {
            throw new Error('Un compte avec cet email existe déjà.')
          }

          // Hash the password
          const passwordHash = await bcrypt.hash(password, 12)

          // Create the user
          const user = await db.user.create({
            data: {
              email,
              name: email.split('@')[0],
              passwordHash,
            },
          })

          return { id: user.id, email: user.email, name: user.name }
        }

        // --- LOGIN ---
        const user = await db.user.findUnique({ where: { email } })

        if (!user) {
          // Demo mode: auto-create user without password if no password provided
          // This allows the demo flow to continue working
          if (!credentials.password) {
            const newUser = await db.user.create({
              data: { email, name: email.split('@')[0] },
            })
            return { id: newUser.id, email: newUser.email, name: newUser.name }
          }
          throw new Error('Email ou mot de passe incorrect.')
        }

        // If user has a password, verify it
        if (user.passwordHash) {
          if (!credentials.password) {
            throw new Error('Mot de passe requis pour ce compte.')
          }
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!isValid) {
            throw new Error('Email ou mot de passe incorrect.')
          }
        }

        // If user has no password (OAuth-only or demo account), allow login without password
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, error }: { user: any; account: any; profile?: any; error?: any }) {
      // Handle credentials provider errors
      if (error) {
        const errorMsg = typeof error === 'string' ? error : error?.message || 'Erreur de connexion'
        throw new Error(errorMsg)
      }

      // Only handle OAuth providers (google, azure-ad)
      if (account?.provider === 'google' || account?.provider === 'azure-ad') {
        try {
          // Upsert user
          let existingUser = await db.user.findUnique({ where: { email: user.email! } })
          if (!existingUser) {
            existingUser = await db.user.create({
              data: { email: user.email!, name: user.name || user.email!.split('@')[0] },
            })
          }

          // Upsert Account model for NextAuth adapter pattern
          await db.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            create: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token ? encrypt(account.refresh_token) : null,
              access_token: account.access_token ? encrypt(account.access_token) : null,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | null,
            },
            update: {
              refresh_token: account.refresh_token ? encrypt(account.refresh_token) : undefined,
              access_token: account.access_token ? encrypt(account.access_token) : undefined,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | null,
            },
          })

          // Save/update email account with encrypted tokens
          const emailProvider = account.provider === 'google' ? 'gmail' : 'outlook'
          const existingEmailAccount = await db.emailAccount.findFirst({
            where: { email: user.email!, userId: existingUser.id },
          })

          const tokenExpiry = account.expires_at
            ? new Date(account.expires_at * 1000)
            : null

          const scopes = account.scope || null

          if (existingEmailAccount) {
            await db.emailAccount.update({
              where: { id: existingEmailAccount.id },
              data: {
                provider: emailProvider,
                accessToken: account.access_token ? encrypt(account.access_token) : existingEmailAccount.accessToken,
                refreshToken: account.refresh_token ? encrypt(account.refresh_token) : existingEmailAccount.refreshToken,
                tokenExpiry,
                scopes,
                isPrimary: true,
              },
            })
          } else {
            await db.emailAccount.create({
              data: {
                provider: emailProvider,
                email: user.email!,
                accessToken: account.access_token ? encrypt(account.access_token) : null,
                refreshToken: account.refresh_token ? encrypt(account.refresh_token) : null,
                tokenExpiry,
                scopes,
                isPrimary: true,
                userId: existingUser.id,
              },
            })
          }
        } catch (error) {
          console.error('Error saving OAuth data:', error)
        }
      }
      return true
    },

    async jwt({ token, account, user, trigger }) {
      // Initial sign in - store tokens in JWT
      if (account && user) {
        token.userId = user.id
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000
        token.role = 'user' // Default role, will be updated on next JWT refresh
        return token
      }

      // Fetch user role if not in token (first call after sign-in)
      if (!token.role && token.userId) {
        const dbUser = await db.user.findUnique({
          where: { id: token.userId as string },
          select: { role: true, suspendedAt: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.suspended = !!dbUser.suspendedAt
        }
      }

      // Return previous token if still valid (with 5 min buffer)
      const now = Date.now()
      const bufferMs = 5 * 60 * 1000
      if (token.accessTokenExpires && now < (token.accessTokenExpires as number) - bufferMs) {
        return token
      }

      // Token is expired, try to refresh
      if (token.refreshToken && token.provider) {
        try {
          const refreshToken = token.refreshToken as string
          const provider = token.provider as string

          // Try to decrypt if it's encrypted (from DB)
          let actualRefreshToken = refreshToken
          try {
            actualRefreshToken = decrypt(refreshToken)
          } catch {
            // Not encrypted, use as-is
          }

          const refreshed = await refreshOAuthToken(provider, actualRefreshToken)

          if (refreshed) {
            // Update the database with new tokens
            const dbUser = await db.user.findUnique({
              where: { email: token.email! },
              include: { emailAccounts: true, accounts: true },
            })

            if (dbUser) {
              const emailAccount = dbUser.emailAccounts.find(
                (ea) => ea.provider === (provider === 'google' ? 'gmail' : 'outlook')
              )
              if (emailAccount) {
                await db.emailAccount.update({
                  where: { id: emailAccount.id },
                  data: {
                    accessToken: encrypt(refreshed.accessToken),
                    refreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : undefined,
                    tokenExpiry: new Date(Date.now() + refreshed.expiresIn * 1000),
                  },
                })
              }

              // Also update the Account model
              const accountRecord = dbUser.accounts.find((a) => a.provider === provider)
              if (accountRecord) {
                await db.account.update({
                  where: { id: accountRecord.id },
                  data: {
                    access_token: encrypt(refreshed.accessToken),
                    refresh_token: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : undefined,
                    expires_at: Math.floor(Date.now() / 1000) + refreshed.expiresIn,
                  },
                })
              }
            }

            return {
              ...token,
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken || token.refreshToken,
              accessTokenExpires: Date.now() + refreshed.expiresIn * 1000,
            }
          }
        } catch (error) {
          console.error('Error refreshing token:', error)
        }
      }

      // If refresh failed, keep existing token (might still work briefly)
      return token
    },

    async session({ session, token }) {
      // Expose user ID and provider info from JWT to session
      if (session.user) {
        session.user.id = token.userId as string

        // Fetch email accounts to expose in session
        if (session.user.email) {
          try {
            const dbUser = await db.user.findUnique({
              where: { email: session.user.email },
              include: { emailAccounts: { select: { id: true, provider: true, email: true, isPrimary: true, tokenExpiry: true, scopes: true } } },
            })
            if (dbUser) {
              session.user.id = dbUser.id
              session.user.onboardingDone = dbUser.onboardingDone
              ;(session as unknown as Record<string, unknown>).emailAccounts = dbUser.emailAccounts
            }
          } catch {
            // Non-critical, continue
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'burozen-dev-secret-key-do-not-use-in-prod'),
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
