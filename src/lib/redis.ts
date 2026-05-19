import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required by BullMQ
    lazyConnect: true,         // Don't connect at import time (build-safe)
    retryStrategy(times) {
      // Stop retrying after 3 attempts to avoid crashing during build
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    },
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
