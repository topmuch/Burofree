import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { templateCreateSchema } from '@/lib/validations/productivity'
import { z } from 'zod'

const templateQuerySchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  isDefault: z.enum(['true', 'false']).optional(),
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
    const queryParse = templateQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!queryParse.success) {
      return NextResponse.json(
        { error: 'Paramètres de requête invalides', details: queryParse.error.flatten() },
        { status: 400 }
      )
    }
    const { type, category, isDefault, search } = queryParse.data

    const where: Record<string, unknown> = { userId: user.id }
    if (type) where.type = type
    if (category) where.category = category
    if (isDefault !== undefined) where.isDefault = isDefault === 'true'
    if (search) where.name = { contains: search }

    const templates = await db.template.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json({ error: 'Échec du chargement des templates' }, { status: 500 })
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

    // Validate body
    const body = await req.json()
    const parse = templateCreateSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parse.error.flatten() },
        { status: 400 }
      )
    }
    const data = parse.data

    // Extract variable names from content using {variable_name} pattern
    const variablePattern = /\{(\w+)\}/g
    const extractedVariables: string[] = []
    let match: RegExpExecArray | null
    while ((match = variablePattern.exec(data.content)) !== null) {
      if (!extractedVariables.includes(match[1])) {
        extractedVariables.push(match[1])
      }
    }

    // Use provided variables or extracted ones
    const variables = data.variables
      ? JSON.stringify(data.variables)
      : JSON.stringify(extractedVariables)

    const template = await db.template.create({
      data: {
        name: data.name,
        description: data.description || null,
        type: data.type,
        content: data.content,
        variables,
        category: data.category,
        icon: data.icon || null,
        isDefault: data.isDefault,
        usageCount: 0,
        userId: user.id,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Templates POST error:', error)
    return NextResponse.json({ error: 'Échec de la création du template' }, { status: 500 })
  }
}
