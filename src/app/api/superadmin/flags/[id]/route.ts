/**
 * PATCH  /api/superadmin/flags/[id] — Update a feature flag.
 * DELETE /api/superadmin/flags/[id] — Delete a feature flag.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { featureFlagUpdateSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const { id } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = featureFlagUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify flag exists
    const existing = await db.featureFlag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Feature flag introuvable.' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedBy: admin.id,
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.rollout !== undefined) updateData.rollout = data.rollout
    if (data.segments !== undefined) updateData.segments = JSON.stringify(data.segments)

    const updated = await db.featureFlag.update({
      where: { id },
      data: updateData,
    })

    await logAdminAction(admin.id, 'admin.flag_update', 'flag', id, {
      previousValues: {
        name: existing.name,
        enabled: existing.enabled,
        rollout: existing.rollout,
        segments: existing.segments,
      },
      newValues: data,
    }, req)

    return NextResponse.json({
      ...updated,
      segments: JSON.parse(updated.segments || '[]'),
      variants: JSON.parse(updated.variants || '{}'),
    })
  } catch (error) {
    console.error('[SuperAdmin Flag PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du feature flag.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const { id } = await params

    // Verify flag exists
    const existing = await db.featureFlag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Feature flag introuvable.' },
        { status: 404 }
      )
    }

    // Prevent deletion of critical flags
    const criticalFlags = ['maintenance_mode', 'platform_enabled']
    if (criticalFlags.includes(existing.key)) {
      return NextResponse.json(
        { error: `Le flag "${existing.key}" est critique et ne peut pas être supprimé. Désactivez-le à la place.` },
        { status: 403 }
      )
    }

    await db.featureFlag.delete({ where: { id } })

    await logAdminAction(admin.id, 'admin.flag_delete', 'flag', id, {
      key: existing.key,
      name: existing.name,
    }, req)

    return NextResponse.json({
      message: `Le feature flag "${existing.key}" a été supprimé.`,
    })
  } catch (error) {
    console.error('[SuperAdmin Flag DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du feature flag.' },
      { status: 500 }
    )
  }
}
