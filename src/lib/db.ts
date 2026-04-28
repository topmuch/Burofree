import { PrismaClient } from '@prisma/client'

// PostgreSQL returns BigInt for some aggregate queries (e.g., pg_database_size).
// JSON.stringify cannot serialize BigInt natively, so we add a toJSON override.
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function () {
    return Number(this)
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db