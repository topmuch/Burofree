import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('jwt-simple module', () => {
  let sign: typeof import('@/lib/jwt-simple').sign
  let verify: typeof import('@/lib/jwt-simple').verify

  beforeEach(async () => {
    // jwt-simple.ts calls getSecret() at module level (line 17),
    // so we MUST set NEXTAUTH_SECRET BEFORE importing the module
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-for-vitest')
    // Dynamic import to ensure env var is set before module initialization
    const mod = await import('@/lib/jwt-simple')
    sign = mod.sign
    verify = mod.verify
  })

  it('sign/verify round-trips correctly', () => {
    const payload = { userId: '123', role: 'admin' }
    const token = sign(payload)
    const decoded = verify(token)

    expect(decoded.userId).toBe('123')
    expect(decoded.role).toBe('admin')
    expect(decoded.iat).toBeDefined()
  })

  it('verify throws for invalid signatures', () => {
    const payload = { data: 'test' }
    const token = sign(payload)
    // Tamper with the signature by flipping the last character
    const parts = token.split('.')
    const sig = parts[2]
    const lastChar = sig.charCodeAt(sig.length - 1)
    const flippedChar = String.fromCharCode(lastChar === 65 ? 66 : 65) // flip between 'A' and 'B'
    parts[2] = sig.slice(0, -1) + flippedChar

    expect(() => verify(parts.join('.'))).toThrow(/signature/i)
  })

  it('verify throws for expired tokens', () => {
    vi.useFakeTimers()
    const payload = { data: 'expires-soon' }
    // Sign with 1s expiry
    const token = sign(payload, { expiresIn: '1s' })
    // Advance time past expiry
    vi.advanceTimersByTime(2000)

    expect(() => verify(token)).toThrow(/expired/i)
    vi.useRealTimers()
  })

  it('verify throws for malformed tokens', () => {
    expect(() => verify('not-a-jwt')).toThrow(/format/i)
    expect(() => verify('only.two')).toThrow(/format/i)
    expect(() => verify('a.b.c.d')).toThrow(/format/i)
  })

  it('sign includes iat and exp when expiresIn is provided', () => {
    const payload = { email: 'user@test.com' }
    const now = Math.floor(Date.now() / 1000)
    const token = sign(payload, { expiresIn: '1h' })
    const decoded = verify(token)

    expect(decoded.iat).toBeGreaterThanOrEqual(now - 2)
    expect(decoded.iat).toBeLessThanOrEqual(now + 2)
    expect(decoded.exp).toBeGreaterThan(decoded.iat)
  })
})
