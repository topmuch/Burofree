/**
 * Import API — Import data with validation and preview
 *
 * POST: Upload and import data (with optional preview)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { previewImport, executeImport, type EntityType } from '@/features/production/export-import/engine'
import { z } from 'zod'

const importCreateSchema = z.object({
  format: z.enum(['csv', 'json']).default('json'),
  entityType: z.enum(['tasks', 'invoices', 'projects', 'time_entries']).default('tasks'),
  data: z.array(z.record(z.unknown())).min(1, 'Au moins un enregistrement requis').max(10000, 'Maximum 10000 enregistrements par import'),
  previewOnly: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimitId = getRateLimitIdentifier(req, auth.user.id)
  const rateCheck = checkRateLimit(rateLimitId, { maxRequests: 10, windowMs: 60 * 1000 })
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Maximum 10 imports par minute.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = importCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  }

  const { format, entityType, data, previewOnly, skipDuplicates } = parsed.data

  // Create import job record
  const job = await db.exportJob.create({
    data: {
      userId: auth.user.id,
      type: 'import',
      format,
      entityType,
      status: 'pending',
      rowCount: data.length,
    },
  })

  try {
    if (previewOnly) {
      // Preview mode — validate without committing
      const preview = await previewImport({
        userId: auth.user.id,
        format,
        entityType: entityType as EntityType,
        data,
        previewOnly: true,
        skipDuplicates,
      })

      await db.exportJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          errorCount: preview.errors.length,
          completedAt: new Date(),
        },
      })

      return NextResponse.json({ preview, jobId: job.id })
    }

    // Execute import
    await db.exportJob.update({
      where: { id: job.id },
      data: { status: 'processing', startedAt: new Date() },
    })

    const result = await executeImport({
      userId: auth.user.id,
      format,
      entityType: entityType as EntityType,
      data,
      skipDuplicates,
    })

    await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        rowCount: result.imported,
        errorCount: result.errors,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      jobId: job.id,
    })
  } catch (error) {
    await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
        completedAt: new Date(),
      },
    })

    return NextResponse.json(
      { error: 'Erreur lors de l\'import', jobId: job.id },
      { status: 500 }
    )
  }
}
