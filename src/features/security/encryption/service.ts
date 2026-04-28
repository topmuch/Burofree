/**
 * Encryption Service - AES-256-GCM with key rotation support
 * Manages encryption key versions and provides encrypt/decrypt with automatic key versioning
 *
 * Format: v{version}:{base64(iv + authTag + ciphertext)}
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'
import { db } from '@/lib/db'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

// In-memory key cache (version → derived key)
const keyVersionCache = new Map<number, Buffer>()

/**
 * Derive a 32-byte key from the ENCRYPTION_KEY env variable with a version-specific salt.
 * Falls back to a dev-only key if ENCRYPTION_KEY is not set.
 */
function deriveKey(version: number): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production.')
    }
    console.warn('[SECURITY] Using development-only encryption key. Set ENCRYPTION_KEY in production!')
  }
  const keySource = secret || 'burozen-dev-encryption-key-do-not-use-in-prod'
  const salt = `burozen-encryption-salt-v${version}`
  return scryptSync(keySource, salt, KEY_LENGTH)
}

/**
 * Get the current active encryption key (with caching)
 */
async function getActiveKey(): Promise<{ version: number; key: Buffer }> {
  // Try to find or create key record
  let keyRecord = await db.encryptionKey.findFirst({
    where: { activeUntil: null },
    orderBy: { version: 'desc' },
  })

  if (!keyRecord) {
    // No active key — create version 1
    const key = deriveKey(1)
    const keyHash = createHash('sha256').update(key).digest('hex')

    keyRecord = await db.encryptionKey.create({
      data: { version: 1, keyHash, activeFrom: new Date() },
    })
  }

  // Check cache
  let key = keyVersionCache.get(keyRecord.version)
  if (!key) {
    key = deriveKey(keyRecord.version)
    keyVersionCache.set(keyRecord.version, key)
  }

  return { version: keyRecord.version, key }
}

/**
 * Get a specific key version for decryption
 */
async function getKeyForVersion(version: number): Promise<Buffer> {
  let key = keyVersionCache.get(version)
  if (key) return key

  // Verify this version exists in DB
  const keyRecord = await db.encryptionKey.findUnique({ where: { version } })
  if (!keyRecord) {
    throw new Error(`Encryption key version ${version} not found`)
  }

  key = deriveKey(version)
  keyVersionCache.set(version, key)
  return key
}

/**
 * Encrypt with version prefix for key rotation support
 * Format: v{version}:{base64(iv + authTag + ciphertext)}
 */
export async function encryptField(plaintext: string): Promise<string> {
  const { version, key } = await getActiveKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const result = Buffer.concat([iv, authTag, encrypted])
  return `v${version}:${result.toString('base64')}`
}

/**
 * Decrypt with version awareness for key rotation
 */
export async function decryptField(encrypted: string): Promise<string> {
  let version: number
  let data: string

  if (encrypted.startsWith('v')) {
    const colonIdx = encrypted.indexOf(':')
    if (colonIdx === -1) {
      throw new Error('Invalid encrypted format: missing colon after version prefix')
    }
    version = parseInt(encrypted.substring(1, colonIdx), 10)
    data = encrypted.substring(colonIdx + 1)
  } else {
    // Legacy format (no version prefix) - use version 1
    version = 1
    data = encrypted
  }

  const key = await getKeyForVersion(version)
  const buffer = Buffer.from(data, 'base64')
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Rotate encryption key - creates new version, marks old as expired
 * In production, this would integrate with a KMS/Vault for key generation.
 */
export async function rotateEncryptionKey(adminUserId: string): Promise<{ oldVersion: number; newVersion: number }> {
  const currentKey = await db.encryptionKey.findFirst({
    where: { activeUntil: null },
    orderBy: { version: 'desc' },
  })
  const oldVersion = currentKey?.version || 0

  // Mark current key as expired
  if (currentKey) {
    await db.encryptionKey.update({
      where: { id: currentKey.id },
      data: { activeUntil: new Date() },
    })
  }

  const newVersion = oldVersion + 1
  const newKey = deriveKey(newVersion)
  const newKeyHash = createHash('sha256').update(newKey).digest('hex')

  await db.encryptionKey.create({
    data: {
      version: newVersion,
      keyHash: newKeyHash,
      activeFrom: new Date(),
      rotatedBy: adminUserId,
    },
  })

  // Update cache
  keyVersionCache.set(newVersion, newKey)

  return { oldVersion, newVersion }
}

/**
 * Get encryption key status
 */
export async function getEncryptionStatus() {
  const keys = await db.encryptionKey.findMany({
    orderBy: { version: 'desc' },
    take: 10,
  })
  const activeKey = keys.find(k => !k.activeUntil)
  return {
    currentVersion: activeKey?.version || 0,
    algorithm: ALGORITHM,
    totalKeys: keys.length,
    lastRotation: activeKey?.activeFrom || null,
    keys: keys.map(k => ({
      version: k.version,
      activeFrom: k.activeFrom,
      activeUntil: k.activeUntil,
      rotatedBy: k.rotatedBy,
      algorithm: k.algorithm,
    })),
  }
}
