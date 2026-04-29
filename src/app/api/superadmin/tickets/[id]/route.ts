/**
 * PATCH /api/superadmin/tickets/[id] — Update a support ticket.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { ticketUpdateSchema } from '@/lib/validations/superadmin'
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

    const parsed = ticketUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify ticket exists
    const existing = await db.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        priority: true,
        assignedTo: true,
        resolution: true,
        firstResponseAt: true,
        resolvedAt: true,
        subject: true,
        userId: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Ticket de support introuvable.' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (data.status !== undefined) {
      updateData.status = data.status

      // Auto-set resolvedAt when resolving/closing
      if ((data.status === 'resolved' || data.status === 'closed') && !existing.resolvedAt) {
        updateData.resolvedAt = new Date()
      }

      // Reopen: clear resolvedAt
      if (data.status === 'open' || data.status === 'in_progress') {
        updateData.resolvedAt = null
      }
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority
    }

    if (data.assignedTo !== undefined) {
      // Validate assigned admin exists
      if (data.assignedTo) {
        const assignedAdmin = await db.user.findUnique({
          where: { id: data.assignedTo },
          select: { id: true, role: true },
        })

        if (!assignedAdmin) {
          return NextResponse.json(
            { error: 'Administrateur assigné introuvable.' },
            { status: 400 }
          )
        }
      }
      updateData.assignedTo = data.assignedTo

      // Set firstResponseAt if this is the first assignment
      if (data.assignedTo && !existing.firstResponseAt) {
        updateData.firstResponseAt = new Date()
      }
    }

    if (data.resolution !== undefined) {
      updateData.resolution = data.resolution
    }

    const updated = await db.supportTicket.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        assignedTo: true,
        resolution: true,
        firstResponseAt: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    })

    // Enrich with user info
    const user = await db.user.findUnique({
      where: { id: updated.userId },
      select: { id: true, email: true, name: true },
    })

    // Enrich with assigned admin info
    let assignedAdmin: { id: string; email: string; name: string | null } | null = null
    if (updated.assignedTo) {
      assignedAdmin = await db.user.findUnique({
        where: { id: updated.assignedTo },
        select: { id: true, email: true, name: true },
      })
    }

    await logAdminAction(admin.id, 'admin.ticket_update', 'ticket', id, {
      previousStatus: existing.status,
      previousPriority: existing.priority,
      previousAssignedTo: existing.assignedTo,
      changes: data,
    }, req)

    return NextResponse.json({
      ...updated,
      user,
      assignedAdmin,
    })
  } catch (error) {
    console.error('[SuperAdmin Ticket PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du ticket de support.' },
      { status: 500 }
    )
  }
}
