import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { tagUpdateSchema } from '@/lib/validations/productivity'

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

    const tag = await db.tag.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: {
          select: {
            taskTags: true,
            emailTags: true,
            documentTags: true,
            projectTags: true,
          },
        },
        taskTags: { include: { task: true } },
        emailTags: { include: { email: true } },
        documentTags: { include: { document: true } },
        projectTags: { include: { project: true } },
      },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag non trouvé' }, { status: 404 })
    }

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag GET error:', error)
    return NextResponse.json({ error: 'Échec du chargement du tag' }, { status: 500 })
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
    const existing = await db.tag.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Tag non trouvé' }, { status: 404 })
    }

    // Validate body with Zod
    const body = await req.json()
    const parse = tagUpdateSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parse.error.flatten() },
        { status: 400 }
      )
    }
    const data = parse.data

    // If renaming, check uniqueness
    if (data.name && data.name.trim() !== existing.name) {
      const nameConflict = await db.tag.findFirst({
        where: { userId: user.id, name: data.name.trim(), NOT: { id } },
      })
      if (nameConflict) {
        return NextResponse.json(
          { error: `Le tag "${data.name.trim()}" existe déjà` },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.color !== undefined) updateData.color = data.color
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.category !== undefined) updateData.category = data.category

    const tag = await db.tag.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag PUT error:', error)
    return NextResponse.json({ error: 'Échec de la mise à jour du tag' }, { status: 500 })
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
    const existing = await db.tag.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Tag non trouvé' }, { status: 404 })
    }

    // Deleting the tag will cascade-delete all junction entries (TaskTag, EmailTag, DocumentTag, ProjectTag)
    await db.tag.delete({ where: { id } })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error) {
    console.error('Tag DELETE error:', error)
    return NextResponse.json({ error: 'Échec de la suppression du tag' }, { status: 500 })
  }
}
