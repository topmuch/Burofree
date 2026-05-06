import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('crypto module', () => {
  let encrypt: typeof import('@/lib/crypto').encrypt
  let decrypt: typeof import('@/lib/crypto').decrypt
  let isEncrypted: typeof import('@/lib/crypto').isEncrypted

  beforeEach(() => {
    // crypto.ts calls getEncryptionKey() lazily inside each function,
    // so we set ENCRYPTION_KEY before importing/re-importing
    process.env.ENCRYPTION_KEY = 'test-key-for-vitest-32chars!!'
  })

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY
  })

  it('encrypt/decrypt round-trips correctly', async () => {
    // Dynamic import so ENCRYPTION_KEY is set before module loads
    const mod = await import('@/lib/crypto')
    encrypt = mod.encrypt
    decrypt = mod.decrypt

    const plaintext = 'Hello, Burozen!'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('encrypt produces different outputs for same input (random IV)', async () => {
    const mod = await import('@/lib/crypto')
    encrypt = mod.encrypt
    decrypt = mod.decrypt

    const plaintext = 'same input every time'
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    // Due to random IV, encrypted outputs should differ
    expect(encrypted1).not.toBe(encrypted2)

    // But both should decrypt to the same plaintext
    expect(decrypt(encrypted1)).toBe(plaintext)
    expect(decrypt(encrypted2)).toBe(plaintext)
  })

  it('decrypt throws for invalid input', async () => {
    const mod = await import('@/lib/crypto')
    decrypt = mod.decrypt

    expect(() => decrypt('not-valid-base64!!!')).toThrow()
    expect(() => decrypt('dGVzdA==')).toThrow() // too short (just "test")
  })

  it('isEncrypted detects encrypted strings', async () => {
    const mod = await import('@/lib/crypto')
    encrypt = mod.encrypt
    isEncrypted = mod.isEncrypted

    const encrypted = encrypt('some sensitive data')
    expect(isEncrypted(encrypted)).toBe(true)
    expect(isEncrypted('plain text')).toBe(false)
    expect(isEncrypted('')).toBe(false)
    expect(isEncrypted(null)).toBe(false)
    expect(isEncrypted(undefined)).toBe(false)
  })

  it('getEncryptionKey throws when ENCRYPTION_KEY is not set', async () => {
    // Remove the key so getEncryptionKey() fails
    delete process.env.ENCRYPTION_KEY

    // Need to re-import to test since the module-level code doesn't fail,
    // but the function call will fail
    const mod = await import('@/lib/crypto')
    expect(() => mod.encrypt('test')).toThrow(/ENCRYPTION_KEY/)
  })
})
