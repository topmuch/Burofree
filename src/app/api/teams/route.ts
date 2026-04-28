/**
 * Teams API — CRUD for teams
 *
 * GET: List user's teams
 * POST: Create a new team
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { invalidatePermissionCache } from '@/features/security/rbac/checker'
import { z } from 'zod'

const teamCreateSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(50),
  description: z.string().max(500).optional(),
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const memberships = await db.teamMember.findMany({
    where: { userId: auth.user.id, status: 'active' },
    include: {
      team: {
        include: {
          members: {
            where: { status: 'active' },
            select: { id: true, role: true, userId: true, user: { select: { id: true, name: true, email: true, avatar: true } } },
          },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const teams = memberships.map(m => ({
    id: m.team.id,
    name: m.team.name,
    slug: m.team.slug,
    description: m.team.description,
    avatar: m.team.avatar,
    plan: m.team.plan,
    maxMembers: m.team.maxMembers,
    memberCount: m.team._count.members,
    myRole: m.role,
    members: m.team.members,
    createdAt: m.team.createdAt,
  }))

  return NextResponse.json({ teams })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimitId = getRateLimitIdentifier(req, auth.user.id)
  const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = teamCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  }

  const { name, description, slug } = parsed.data

  // Check slug uniqueness
  const existing = await db.team.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 409 })
  }

  // Create team with owner membership
  const team = await db.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        name,
        description,
        slug,
        plan: 'free',
        maxMembers: 5,
      },
    })

    await tx.teamMember.create({
      data: {
        userId: auth.user!.id,
        teamId: newTeam.id,
        role: 'owner',
        status: 'active',
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
    })

    await tx.auditLog.create({
      data: {
        teamId: newTeam.id,
        userId: auth.user!.id,
        action: 'team.create',
        target: 'team',
        targetId: newTeam.id,
        metadata: JSON.stringify({ name, slug }),
      },
    })

    return newTeam
  })

  // Invalidate permission cache for the creator (now owner of the new team)
  invalidatePermissionCache(auth.user!.id)

  return NextResponse.json({ team }, { status: 201 })
}
