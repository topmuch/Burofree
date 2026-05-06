// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('invoice-token module', () => {
  let generateInvoiceToken: typeof import('@/lib/invoice-token').generateInvoiceToken
  let verifyInvoiceToken: typeof import('@/lib/invoice-token').verifyInvoiceToken

  beforeEach(async () => {
    // invoice-token.ts calls getSecret() at module level (line 19),
    // so we MUST set NEXTAUTH_SECRET BEFORE importing the module
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-for-vitest')
    // Dynamic import to ensure env var is set before module initialization
    const mod = await import('@/lib/invoice-token')
    generateInvoiceToken = mod.generateInvoiceToken
    verifyInvoiceToken = mod.verifyInvoiceToken
  })

  it('generateInvoiceToken/verifyInvoiceToken round-trips correctly', async () => {
    const invoiceId = 'inv_12345'
    const token = await generateInvoiceToken(invoiceId)
    const isValid = await verifyInvoiceToken(invoiceId, token)

    expect(isValid).toBe(true)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
  })

  it('verifyInvoiceToken returns false for invalid tokens', async () => {
    const invoiceId = 'inv_99999'
    const fakeToken = 'deadbeef1234567890abcdef'

    const isValid = await verifyInvoiceToken(invoiceId, fakeToken)
    expect(isValid).toBe(false)
  })

  it('verifyInvoiceToken returns false for wrong invoice IDs', async () => {
    const correctInvoiceId = 'inv_correct'
    const wrongInvoiceId = 'inv_wrong'

    const token = await generateInvoiceToken(correctInvoiceId)

    // Token generated for one invoice should not validate for another
    const isValid = await verifyInvoiceToken(wrongInvoiceId, token)
    expect(isValid).toBe(false)
  })

  it('generates deterministic tokens for same input', async () => {
    const invoiceId = 'inv_deterministic'
    const token1 = await generateInvoiceToken(invoiceId)
    const token2 = await generateInvoiceToken(invoiceId)

    // Same invoice ID + same secret = same token
    expect(token1).toBe(token2)
  })
})
