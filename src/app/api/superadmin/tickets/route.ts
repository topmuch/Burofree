/**
 * GET /api/superadmin/tickets — List support tickets with cursor-based pagination.
 *
 * Supports filtering by status, priority, and assigned admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const ticketSearchSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_user', 'resolved', 'closed', 'all']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent', 'all']).optional(),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
})

export async function GET(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = ticketSearchSchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { status, priority, category, assignedTo, search, cursor, limit } = parsed.data

    // Build where clause
    const where: Prisma.SupportTicketWhereInput = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    if (category) {
      where.category = category
    }

    if (assignedTo) {
      where.assignedTo = assignedTo
    }

    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { description: { contains: search } },
      ]
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor }
    }

    const [tickets, totalCount] = await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit + 1,
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
      }),
      db.supportTicket.count({ where }),
    ])

    const hasMore = tickets.length > limit
    const trimmedTickets = hasMore ? tickets.slice(0, limit) : tickets
    const nextCursor = hasMore ? trimmedTickets[trimmedTickets.length - 1].id : null

    // Enrich with user info
    const userIds = [...new Set(trimmedTickets.map(t => t.userId))]
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, avatar: true },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // Enrich with assigned admin info
    const assignedIds = [...new Set(trimmedTickets.filter(t => t.assignedTo).map(t => t.assignedTo!))]
    const assignedAdmins = assignedIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: assignedIds } },
          select: { id: true, email: true, name: true },
        })
      : []
    const adminMap = new Map(assignedAdmins.map(a => [a.id, a]))

    const enrichedTickets = trimmedTickets.map(ticket => ({
      ...ticket,
      user: userMap.get(ticket.userId) || null,
      assignedAdmin: ticket.assignedTo ? adminMap.get(ticket.assignedTo) || null : null,
    }))

    // Summary stats
    const [openCount, urgentCount, unassignedCount] = await Promise.all([
      db.supportTicket.count({ where: { status: { in: ['open', 'in_progress', 'waiting_user'] } } }),
      db.supportTicket.count({ where: { priority: 'urgent', status: { in: ['open', 'in_progress'] } } }),
      db.supportTicket.count({ where: { assignedTo: null, status: { in: ['open', 'in_progress'] } } }),
    ])

    await logAdminAction(admin.id, 'admin.tickets_list', 'ticket', null, {
      status,
      priority,
      resultsCount: totalCount,
    }, req)

    return NextResponse.json({
      tickets: enrichedTickets,
      pagination: {
        total: totalCount,
        limit,
        hasMore,
        nextCursor,
      },
      summary: {
        open: openCount,
        urgent: urgentCount,
        unassigned: unassignedCount,
      },
    })
  } catch (error) {
    console.error('[SuperAdmin Tickets GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des tickets de support.' },
      { status: 500 }
    )
  }
}
