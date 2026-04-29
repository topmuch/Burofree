/**
 * GET  /api/superadmin/flags — Get all feature flags.
 * POST /api/superadmin/flags — Create a new feature flag.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { featureFlagCreateSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const flags = await db.featureFlag.findMany({
      orderBy: [{ enabled: 'desc' }, { key: 'asc' }],
    })

    // Parse JSON fields
    const parsedFlags = flags.map(flag => ({
      ...flag,
      segments: JSON.parse(flag.segments || '[]') as string[],
      variants: JSON.parse(flag.variants || '{}') as Record<string, unknown>,
    }))

    const summary = {
      total: flags.length,
      enabled: flags.filter(f => f.enabled).length,
      disabled: flags.filter(f => !f.enabled).length,
      withRollout: flags.filter(f => f.rollout > 0 && f.rollout < 100).length,
    }

    await logAdminAction(admin.id, 'admin.flags_list', 'flag', null, undefined, req)

    return NextResponse.json({
      flags: parsedFlags,
      summary,
    })
  } catch (error) {
    console.error('[SuperAdmin Flags GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des feature flags.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = featureFlagCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { key, name, description, enabled, rollout, segments } = parsed.data

    // Check for duplicate key
    const existing = await db.featureFlag.findUnique({ where: { key } })
    if (existing) {
      return NextResponse.json(
        { error: `Un feature flag avec la clé "${key}" existe déjà.` },
        { status: 409 }
      )
    }

    const flag = await db.featureFlag.create({
      data: {
        key,
        name,
        description: description || null,
        enabled,
        rollout,
        segments: JSON.stringify(segments),
        variants: '{}',
        updatedBy: admin.id,
      },
    })

    await logAdminAction(admin.id, 'admin.flag_create', 'flag', flag.id, {
      key,
      name,
      enabled,
      rollout,
      segments,
    }, req)

    return NextResponse.json({
      ...flag,
      segments: JSON.parse(flag.segments),
      variants: JSON.parse(flag.variants),
    }, { status: 201 })
  } catch (error) {
    console.error('[SuperAdmin Flags POST] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du feature flag.' },
      { status: 500 }
    )
  }
}
