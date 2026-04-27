import { createHmac, timingSafeEqual } from 'crypto'

const PORTAL_SECRET = process.env.PORTAL_SECRET || process.env.NEXTAUTH_SECRET || 'burofree-portal-dev'

/**
 * Generate a secure portal token for a project
 */
export function generatePortalToken(projectId: string, inviteId: string): string {
  const payload = `${projectId}:${inviteId}`
  const hmac = createHmac('sha256', PORTAL_SECRET).update(payload).digest('hex')
  return `${inviteId}.${hmac.substring(0, 16)}`
}

/**
 * Verify a portal token and return the invite ID
 */
export function verifyPortalToken(token: string, projectId: string): string | null {
  const [inviteId, signature] = token.split('.')
  if (!inviteId || !signature) return null

  const payload = `${projectId}:${inviteId}`
  const expectedSig = createHmac('sha256', PORTAL_SECRET).update(payload).digest('hex').substring(0, 16)

  try {
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return inviteId
    }
  } catch {
    return null
  }
  return null
}
