/**
 * Simple JWT sign/verify utility for team invitations
 *
 * Uses HMAC-SHA256 with NEXTAUTH_SECRET as the signing key.
 * Lightweight alternative to jsonwebtoken — no external dependency.
 */

import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET || 'burofree-dev-secret-key-change-in-production'

interface SignOptions {
  expiresIn?: string // e.g. '7d', '24h', '30m'
}

function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid expiresIn format: ${expiresIn}`)

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: throw new Error(`Unknown time unit: ${unit}`)
  }
}

/**
 * Sign a payload as a JWT-like token.
 * Format: base64url(header).base64url(payload).base64url(signature)
 */
export function sign(payload: Record<string, unknown>, options?: SignOptions): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: options?.expiresIn ? now + parseExpiry(options.expiresIn) : undefined,
  }

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url')

  const signature = createHmac('sha256', SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url')

  return `${headerB64}.${payloadB64}.${signature}`
}

/**
 * Verify and decode a JWT-like token.
 * Returns the payload if valid, throws otherwise.
 */
export function verify(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')

  const [headerB64, payloadB64, signatureB64] = parts

  // Verify signature
  const expectedSignature = createHmac('sha256', SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url')

  const sigBuffer = Buffer.from(signatureB64)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature')
  }

  // Decode payload
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return payload
}
