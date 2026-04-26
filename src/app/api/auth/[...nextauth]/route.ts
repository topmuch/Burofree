import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || 'mock-azure-client-id',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || 'mock-azure-client-secret',
      tenantId: 'common',
      authorization: {
        params: {
          scope: 'openid email profile Mail.Read Mail.Send Calendars.ReadWrite offline_access',
        },
      },
    }),
    CredentialsProvider({
      name: 'Connexion locale',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        let user = await db.user.findUnique({ where: { email: credentials.email } })
        if (!user) {
          user = await db.user.create({
            data: { email: credentials.email, name: credentials.email.split('@')[0] }
          })
        }
        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'azure-ad') {
        // Upsert user
        const existingUser = await db.user.findUnique({ where: { email: user.email! } })
        if (!existingUser) {
          await db.user.create({
            data: { email: user.email!, name: user.name }
          })
        }
        // Save email account with tokens
        const existingAccount = await db.emailAccount.findFirst({
          where: { email: user.email!, userId: existingUser?.id || '' }
        })
        if (!existingAccount && existingUser) {
          await db.emailAccount.create({
            data: {
              provider: account.provider === 'google' ? 'gmail' : 'outlook',
              email: user.email!,
              accessToken: account.access_token || null,
              refreshToken: account.refresh_token || null,
              isPrimary: true,
              userId: existingUser.id,
            }
          })
        }
      }
      return true
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await db.user.findUnique({ where: { email: session.user.email } })
        if (dbUser) {
          session.user.id = dbUser.id
        }
      }
      return session
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    }
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'maellis-dev-secret-key-change-in-production',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
