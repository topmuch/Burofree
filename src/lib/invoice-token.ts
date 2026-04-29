/**
 * Invoice Token Utility for Burozen
 *
 * Generates and verifies HMAC-based tokens for authenticating
 * invoice PDF access without requiring a session cookie.
 * Used when opening PDFs in a new tab via window.open().
 *
 * Uses the Web Crypto API (SubtleCrypto) which is available
 * in both Edge Runtime (middleware) and Node.js (API routes).
 */

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET environment variable is required in production.')
    }
    console.warn('[SECURITY] Using development-only invoice token secret. Set NEXTAUTH_SECRET in production!')
    return 'burozen-dev-secret-key-do-not-use-in-prod'
  }
  return secret
}
const NEXTAUTH_SECRET = getSecret()

/**
 * Get the HMAC key as a CryptoKey for use with SubtleCrypto.
 * Caches the key after first import.
 */
let cachedKey: CryptoKey | null = null

async function getHmacKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const encoder = new TextEncoder()
  const keyData = encoder.encode(NEXTAUTH_SECRET)

  cachedKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )

  return cachedKey
}

/**
 * Generate an HMAC token for a given invoice ID.
 * The token is deterministic: same invoice ID + same secret = same token.
 * Returns a hex-encoded string.
 */
export async function generateInvoiceToken(invoiceId: string): Promise<string> {
  const key = await getHmacKey()
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(invoiceId))
  return bufferToHex(signature)
}

/**
 * Verify that a token matches the expected value for a given invoice ID.
 * Uses the SubtleCrypto verify method which performs constant-time comparison.
 */
export async function verifyInvoiceToken(invoiceId: string, token: string): Promise<boolean> {
  try {
    const key = await getHmacKey()
    const encoder = new TextEncoder()
    const signatureBuffer = hexToBuffer(token)
    return crypto.subtle.verify('HMAC', key, signatureBuffer, encoder.encode(invoiceId))
  } catch {
    return false
  }
}

/**
 * Convert an ArrayBuffer to a hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Convert a hex string to an ArrayBuffer.
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}
