import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

interface DefaultTag {
  name: string
  color: string
  category: string
  icon: string
}

const DEFAULT_TAGS: DefaultTag[] = [
  { name: '#urgent', color: '#ef4444', category: 'urgent', icon: 'AlertCircle' },
  { name: '#en-attente', color: '#f59e0b', category: 'status', icon: 'Clock' },
  { name: '#client-actif', color: '#10b981', category: 'client', icon: 'UserCheck' },
  { name: '#en-attente-paiement', color: '#f97316', category: 'billing', icon: 'CreditCard' },
  { name: '#priorité-haute', color: '#dc2626', category: 'urgent', icon: 'ArrowUp' },
  { name: '#récurrent', color: '#8b5cf6', category: 'general', icon: 'Repeat' },
  { name: '#facturé', color: '#06b6d4', category: 'billing', icon: 'CheckCircle' },
  { name: '#en-cours', color: '#3b82f6', category: 'status', icon: 'Loader' },
]

export async function POST(req: NextRequest) {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Optionally accept a userId from the body (for admin scenarios), otherwise use the first user
    const body = await req.json().catch(() => ({}))
    const userId = body.userId || user.id

    // Verify user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const created: DefaultTag[] = []
    const skipped: string[] = []

    for (const tagData of DEFAULT_TAGS) {
      try {
        await db.tag.create({
          data: {
            name: tagData.name,
            color: tagData.color,
            category: tagData.category,
            icon: tagData.icon,
            userId,
          },
        })
        created.push(tagData)
      } catch (error) {
        // Unique constraint violation — tag already exists for this user
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          skipped.push(tagData.name)
        } else {
          throw error
        }
      }
    }

    return NextResponse.json({
      message: 'Default tags seeded',
      created: created.length,
      skipped: skipped.length,
      skippedNames: skipped,
    })
  } catch (error) {
    console.error('Tags seed POST error:', error)
    return NextResponse.json({ error: 'Failed to seed default tags' }, { status: 500 })
  }
}
