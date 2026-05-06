/**
 * Rate limiter for Burozen
 *
 * Provides two strategies:
 * 1. `checkRateLimit` — synchronous, in-memory Map (safe for Next.js middleware).
 *    Works for single-instance deployments (docker-compose) and is kept for
 *    backward-compatibility with all 90+ existing consumers.
 *
 * 2. `checkRateLimitRedis` — async, Redis INCR+EXPIRE based.
 *    Use this in async API routes (e.g. auth) for multi-instance correctness.
 *    Falls back to the in-memory Map when Redis is unavailable.
 *
 * Prevents brute-force attacks on authentication endpoints.
 */

import { redis } from '@/lib/redis'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

const REDIS_KEY_PREFIX = 'rate-limit:'

export interface RateLimitOptions {
  /** Max number of requests in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterMs: number
  remaining: number
}

const DEFAULT_AUTH_OPTIONS: RateLimitOptions = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 10 attempts per 15 minutes
}

const DEFAULT_API_OPTIONS: RateLimitOptions = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 requests per minute
}

/**
 * Synchronous in-memory rate limiter.
 *
 * Kept for backward-compatibility with Next.js middleware and all existing
 * API route consumers. Works correctly for single-instance deployments.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = DEFAULT_AUTH_OPTIONS,
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetAt) {
    // No entry or window expired, start fresh
    store.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return { allowed: true, retryAfterMs: 0, remaining: options.maxRequests - 1 }
  }

  if (entry.count >= options.maxRequests) {
    const retryAfterMs = entry.resetAt - now
    return { allowed: false, retryAfterMs, remaining: 0 }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0, remaining: options.maxRequests - entry.count }
}

/**
 * Async Redis-backed rate limiter for multi-instance deployments.
 *
 * Uses Redis INCR + EXPIRE pattern:
 *  - INCR a per-identifier key on every request
 *  - If the key is new (INCR returns 1), set EXPIRE with the window duration
 *  - If count exceeds maxRequests, the request is denied
 *
 * Falls back gracefully to the in-memory Map if Redis is unavailable,
 * so local development without Redis still works.
 *
 * Use this in async API routes (e.g. NextAuth authorize, POST handlers)
 * for cross-instance rate-limit enforcement.
 */
export async function checkRateLimitRedis(
  identifier: string,
  options: RateLimitOptions = DEFAULT_AUTH_OPTIONS,
): Promise<RateLimitResult> {
  const key = `${REDIS_KEY_PREFIX}${identifier}`
  const windowSec = Math.ceil(options.windowMs / 1000)

  try {
    const count = await redis.incr(key)

    // First request in this window — set the TTL
    if (count === 1) {
      await redis.expire(key, windowSec)
    }

    if (count > options.maxRequests) {
      // Get remaining TTL to compute precise retry-after
      const ttl = await redis.ttl(key)
      const retryAfterMs = ttl > 0 ? ttl * 1000 : options.windowMs
      return { allowed: false, retryAfterMs, remaining: 0 }
    }

    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: Math.max(0, options.maxRequests - count),
    }
  } catch {
    // Redis unavailable — fall back to in-memory Map
    return checkRateLimit(identifier, options)
  }
}

/**
 * Get identifier for rate limiting from request
 * Uses IP address + optional identifier (like email)
 */
export function getRateLimitIdentifier(
  request: Request,
  extra?: string,
): string {
  // Try various headers for IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  return extra ? `${ip}:${extra}` : ip
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  options: RateLimitOptions = DEFAULT_AUTH_OPTIONS,
  remaining: number,
  retryAfterMs?: number,
): HeadersInit {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(options.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
  }

  if (retryAfterMs && retryAfterMs > 0) {
    headers['Retry-After'] = String(Math.ceil(retryAfterMs / 1000))
  }

  return headers
}

export { DEFAULT_AUTH_OPTIONS, DEFAULT_API_OPTIONS }
