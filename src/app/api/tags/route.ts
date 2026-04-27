import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { tagCreateSchema } from '@/lib/validations/productivity'
import { z } from 'zod'

const tagQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(200).optional(),
})

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    // Validate query params
    const { searchParams } = new URL(req.url)
    const queryParse = tagQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!queryParse.success) {
      return NextResponse.json(
        { error: 'Paramètres de requête invalides', details: queryParse.error.flatten() },
        { status: 400 }
      )
    }
    const { category, search } = queryParse.data

    const where: Record<string, unknown> = { userId: user.id }
    if (category) where.category = category
    if (search) where.name = { contains: search }

    const tags = await db.tag.findMany({
      where,
      include: {
        _count: {
          select: {
            taskTags: true,
            emailTags: true,
            documentTags: true,
            projectTags: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Tags GET error:', error)
    return NextResponse.json({ error: 'Échec du chargement des tags' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    // Validate body with Zod
    const body = await req.json()
    const parse = tagCreateSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parse.error.flatten() },
        { status: 400 }
      )
    }
    const data = parse.data

    // Validate name uniqueness per user
    const existing = await db.tag.findFirst({
      where: { userId: user.id, name: data.name },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Le tag "${data.name}" existe déjà` },
        { status: 409 }
      )
    }

    const tag = await db.tag.create({
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon || null,
        category: data.category,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            taskTags: true,
            emailTags: true,
            documentTags: true,
            projectTags: true,
          },
        },
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Tags POST error:', error)
    return NextResponse.json({ error: 'Échec de la création du tag' }, { status: 500 })
  }
}
