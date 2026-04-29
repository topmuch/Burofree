/**
 * Token Refresh Utility
 *
 * Server-side utility for refreshing OAuth tokens.
 * Used by API route handlers that need fresh access tokens.
 *
 * This module uses Node.js crypto and Prisma, so it must only
 * be imported in server-side code (API routes, server actions).
 */

import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'

interface RefreshResult {
  accessToken: string
  expiresIn: number
  refreshToken?: string
}

async function refreshGoogleToken(refreshToken: string): Promise<RefreshResult | null> {
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
    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
    }
  } catch {
    return null
  }
}

async function refreshMicrosoftToken(refreshToken: string): Promise<RefreshResult | null> {
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
    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
    }
  } catch {
    return null
  }
}

/**
 * Get a fresh access token for a user's email account.
 * Automatically refreshes the token if it's expired.
 * Returns the decrypted access token ready for API calls.
 */
export async function getFreshAccessToken(userId: string, provider: string): Promise<string | null> {
  const normalizedProvider = provider === 'google' ? 'gmail' : provider === 'azure-ad' ? 'outlook' : provider

  const account = await db.emailAccount.findFirst({
    where: { userId, provider: normalizedProvider },
  })

  if (!account) return null
  if (!account.accessToken && !account.refreshToken) return null

  // Check if token is still valid (with 5 min buffer)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (account.tokenExpiry && new Date(account.tokenExpiry) > new Date(now.getTime() + bufferMs)) {
    // Token is still valid, decrypt and return
    try {
      return decrypt(account.accessToken!)
    } catch {
      // If decryption fails, return as-is (might be unencrypted for dev)
      return account.accessToken
    }
  }

  // Token is expired, try to refresh
  if (!account.refreshToken) return null

  let actualRefreshToken: string
  try {
    actualRefreshToken = decrypt(account.refreshToken)
  } catch {
    actualRefreshToken = account.refreshToken
  }

  let result: RefreshResult | null = null

  if (normalizedProvider === 'gmail') {
    result = await refreshGoogleToken(actualRefreshToken)
  } else if (normalizedProvider === 'outlook') {
    result = await refreshMicrosoftToken(actualRefreshToken)
  }

  if (!result) return null

  // Update the database with new tokens
  await db.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encrypt(result.accessToken),
      refreshToken: result.refreshToken ? encrypt(result.refreshToken) : undefined,
      tokenExpiry: new Date(Date.now() + result.expiresIn * 1000),
    },
  })

  return result.accessToken
}

/**
 * Get all fresh access tokens for a user across all email accounts.
 * Returns a map of provider -> decrypted access token.
 */
export async function getAllFreshTokens(userId: string): Promise<Record<string, string>> {
  const accounts = await db.emailAccount.findMany({
    where: { userId },
  })

  const tokens: Record<string, string> = {}

  for (const account of accounts) {
    const token = await getFreshAccessToken(userId, account.provider)
    if (token) {
      tokens[account.provider] = token
    }
  }

  return tokens
}
