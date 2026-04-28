import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive a 32-byte key from the ENCRYPTION_KEY env variable.
 * Throws in production if ENCRYPTION_KEY is not set.
 * Falls back to a dev-only key in development mode.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production. Generate one with: openssl rand -base64 32')
    }
    console.warn('[SECURITY] Using development-only encryption key. Set ENCRYPTION_KEY in production!')
  }
  const keySource = secret || 'burozen-dev-encryption-key-do-not-use-in-prod'
  const salt = 'burozen-encryption-salt-v1'
  return scryptSync(keySource, salt, KEY_LENGTH)
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: iv + authTag + ciphertext
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Format: iv (16 bytes) + authTag (16 bytes) + encrypted data
  const result = Buffer.concat([iv, authTag, encrypted])

  return result.toString('base64')
}

/**
 * Decrypt a base64-encoded string encrypted with the encrypt() function.
 * Returns the original plaintext string.
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey()
  const buffer = Buffer.from(encrypted, 'base64')

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if a string appears to be encrypted (base64 encoded with our format)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const buffer = Buffer.from(value, 'base64')
    // Our format: at least IV (16) + authTag (16) + some encrypted data
    return buffer.length > IV_LENGTH + AUTH_TAG_LENGTH
  } catch {
    return false
  }
}
