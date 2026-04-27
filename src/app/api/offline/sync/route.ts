/**
 * Offline Sync API — Processes queued offline actions
 *
 * Receives a batch of actions created while offline, validates
 * each one, and applies them to the database. Returns per-action
 * success/error results.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { z } from 'zod'

const offlineActionSchema = z.object({
  actionType: z.enum(['create_task', 'update_task', 'create_note', 'create_email_draft', 'create_time_entry', 'update_project']),
  entityType: z.enum(['task', 'note', 'email', 'time_entry', 'project']),
  entityId: z.string().optional(),
  payload: z.record(z.unknown()),
})

const offlineSyncSchema = z.object({
  actions: z.array(offlineActionSchema).min(1).max(100, 'Maximum 100 actions par synchronisation'),
})

type ActionResult = { success: true; id: string } | { success: false; error: string }

export async function POST(req: NextRequest) {
  // Auth check
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  // Rate limit
  const rateLimitId = getRateLimitIdentifier(req, auth.user.id)
  const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
      { status: 429 }
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = offlineSyncSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { actions } = parsed.data
  const results: ActionResult[] = []

  for (const action of actions) {
    try {
      const result = await processAction(auth.user.id, action)
      results.push(result)
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: 'offline.sync',
      target: 'batch',
      metadata: JSON.stringify({
        total: actions.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }),
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
    },
  })

  return NextResponse.json({ results })
}

async function processAction(
  userId: string,
  action: z.infer<typeof offlineActionSchema>
): Promise<ActionResult> {
  const { actionType, payload } = action

  switch (actionType) {
    case 'create_task': {
      const task = await db.task.create({
        data: {
          title: String(payload.title || 'Tâche hors-ligne'),
          description: payload.description ? String(payload.description) : null,
          status: String(payload.status || 'todo'),
          priority: String(payload.priority || 'medium'),
          dueDate: payload.dueDate ? new Date(String(payload.dueDate)) : null,
          projectId: payload.projectId ? String(payload.projectId) : null,
          userId,
        },
      })
      return { success: true, id: task.id }
    }

    case 'update_task': {
      if (!action.entityId) {
        return { success: false, error: 'entityId requis pour update_task' }
      }
      const updateData: Record<string, unknown> = {}
      if (payload.title) updateData.title = String(payload.title)
      if (payload.status) updateData.status = String(payload.status)
      if (payload.priority) updateData.priority = String(payload.priority)
      if (payload.description) updateData.description = String(payload.description)

      const task = await db.task.update({
        where: { id: action.entityId, userId },
        data: updateData,
      })
      return { success: true, id: task.id }
    }

    case 'create_note': {
      // Notes are stored as documents
      const doc = await db.document.create({
        data: {
          name: String(payload.title || 'Note hors-ligne'),
          type: 'note',
          content: String(payload.content || ''),
          projectId: payload.projectId ? String(payload.projectId) : null,
          userId,
        },
      })
      return { success: true, id: doc.id }
    }

    case 'create_email_draft': {
      // Need an email account — find primary or first
      const emailAccount = await db.emailAccount.findFirst({
        where: { userId, isPrimary: true },
      })
      if (!emailAccount) {
        return { success: false, error: 'Aucun compte email configuré' }
      }

      const email = await db.email.create({
        data: {
          fromAddress: emailAccount.email,
          toAddress: String(payload.to || ''),
          subject: String(payload.subject || 'Brouillon'),
          body: String(payload.body || ''),
          isSent: false,
          category: 'draft',
          source: 'local',
          emailAccountId: emailAccount.id,
          userId,
        },
      })
      return { success: true, id: email.id }
    }

    case 'create_time_entry': {
      const entry = await db.timeEntry.create({
        data: {
          startTime: payload.startTime ? new Date(String(payload.startTime)) : new Date(),
          endTime: payload.endTime ? new Date(String(payload.endTime)) : null,
          duration: payload.duration ? Number(payload.duration) : null,
          description: payload.description ? String(payload.description) : null,
          isBillable: payload.isBillable !== false,
          taskId: payload.taskId ? String(payload.taskId) : null,
          projectId: payload.projectId ? String(payload.projectId) : null,
          userId,
        },
      })
      return { success: true, id: entry.id }
    }

    case 'update_project': {
      if (!action.entityId) {
        return { success: false, error: 'entityId requis pour update_project' }
      }
      const updateData: Record<string, unknown> = {}
      if (payload.name) updateData.name = String(payload.name)
      if (payload.status) updateData.status = String(payload.status)
      if (payload.description) updateData.description = String(payload.description)

      const project = await db.project.update({
        where: { id: action.entityId, userId },
        data: updateData,
      })
      return { success: true, id: project.id }
    }

    default:
      return { success: false, error: `Type d'action non supporté: ${actionType}` }
  }
}
