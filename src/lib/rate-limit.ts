/**
 * Simple in-memory rate limiter for Maellis
 * Prevents brute-force attacks on authentication endpoints
 */

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

export interface RateLimitOptions {
  /** Max number of requests in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
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
 * Check if a request should be rate-limited
 * Returns { allowed: boolean, retryAfterMs: number }
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = DEFAULT_AUTH_OPTIONS,
): { allowed: boolean; retryAfterMs: number; remaining: number } {
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
