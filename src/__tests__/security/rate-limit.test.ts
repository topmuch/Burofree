import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkRateLimit,
  getRateLimitIdentifier,
  createRateLimitHeaders,
  DEFAULT_AUTH_OPTIONS,
  DEFAULT_API_OPTIONS,
} from '@/lib/rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    // Reset rate-limit state by making a unique identifier for each test
  })

  describe('checkRateLimit', () => {
    it('returns allowed: true for first requests', () => {
      const result = checkRateLimit('test-ip-first-request')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(DEFAULT_AUTH_OPTIONS.maxRequests - 1)
    })

    it('returns allowed: false after exceeding maxRequests', () => {
      const identifier = 'test-ip-exceeded'
      const options = { maxRequests: 3, windowMs: 60000 }

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(identifier, options)
        expect(result.allowed).toBe(true)
      }

      // 4th request should be rate-limited
      const result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterMs).toBeGreaterThan(0)
    })

    it('tracks remaining requests correctly', () => {
      const identifier = 'test-ip-remaining'
      const options = { maxRequests: 5, windowMs: 60000 }

      const result1 = checkRateLimit(identifier, options)
      expect(result1.remaining).toBe(4)

      const result2 = checkRateLimit(identifier, options)
      expect(result2.remaining).toBe(3)

      const result3 = checkRateLimit(identifier, options)
      expect(result3.remaining).toBe(2)
    })
  })

  describe('getRateLimitIdentifier', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })
      const id = getRateLimitIdentifier(request)
      expect(id).toBe('1.2.3.4')
    })

    it('extracts IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '10.0.0.1' },
      })
      const id = getRateLimitIdentifier(request)
      expect(id).toBe('10.0.0.1')
    })

    it('falls back to unknown when no IP headers present', () => {
      const request = new Request('http://localhost')
      const id = getRateLimitIdentifier(request)
      expect(id).toBe('unknown')
    })

    it('appends extra identifier when provided', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      })
      const id = getRateLimitIdentifier(request, 'user@example.com')
      expect(id).toBe('1.2.3.4:user@example.com')
    })
  })

  describe('createRateLimitHeaders', () => {
    it('generates correct headers with remaining', () => {
      const headers = createRateLimitHeaders(DEFAULT_AUTH_OPTIONS, 8)
      expect(headers['X-RateLimit-Limit']).toBe(String(DEFAULT_AUTH_OPTIONS.maxRequests))
      expect(headers['X-RateLimit-Remaining']).toBe('8')
      expect(headers['Retry-After']).toBeUndefined()
    })

    it('includes Retry-After when retryAfterMs is provided', () => {
      const headers = createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, 5500)
      expect(headers['X-RateLimit-Limit']).toBe(String(DEFAULT_API_OPTIONS.maxRequests))
      expect(headers['X-RateLimit-Remaining']).toBe('0')
      expect(headers['Retry-After']).toBe('6') // ceil(5500/1000)
    })

    it('omits Retry-After when retryAfterMs is 0', () => {
      const headers = createRateLimitHeaders(DEFAULT_AUTH_OPTIONS, 5, 0)
      expect(headers['Retry-After']).toBeUndefined()
    })
  })
})
