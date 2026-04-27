import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { templateUpdateSchema } from '@/lib/validations/productivity'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const template = await db.template.findFirst({
      where: { id, userId: user.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template GET error:', error)
    return NextResponse.json({ error: 'Échec du chargement du template' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Verify ownership
    const existing = await db.template.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    // Validate body
    const body = await req.json()
    const parse = templateUpdateSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parse.error.flatten() },
        { status: 400 }
      )
    }
    const data = parse.data

    // If content changed, re-extract variables
    const newContent = data.content ?? existing.content
    const variablePattern = /\{(\w+)\}/g
    const extractedVariables: string[] = []
    let match: RegExpExecArray | null
    while ((match = variablePattern.exec(newContent)) !== null) {
      if (!extractedVariables.includes(match[1])) {
        extractedVariables.push(match[1])
      }
    }

    // Use provided variables, or re-extracted ones if content changed
    let variables: string
    if (data.variables) {
      variables = JSON.stringify(data.variables)
    } else if (data.content) {
      variables = JSON.stringify(extractedVariables)
    } else {
      variables = existing.variables
    }

    const template = await db.template.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        description: data.description !== undefined ? data.description : existing.description,
        type: data.type ?? existing.type,
        content: newContent,
        variables,
        category: data.category ?? existing.category,
        icon: data.icon !== undefined ? data.icon : existing.icon,
        isDefault: data.isDefault ?? existing.isDefault,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template PUT error:', error)
    return NextResponse.json({ error: 'Échec de la mise à jour du template' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Verify ownership
    const existing = await db.template.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    await db.template.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template DELETE error:', error)
    return NextResponse.json({ error: 'Échec de la suppression du template' }, { status: 500 })
  }
}
