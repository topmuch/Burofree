/**
 * Export API — Create and download data exports
 *
 * POST: Create a new export job (sync for small, async for large)
 * GET: List user's export jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { executeExport, type ExportFormat, type EntityType } from '@/features/production/export-import/engine'
import { z } from 'zod'

const exportCreateSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('csv'),
  entityType: z.enum(['tasks', 'invoices', 'projects', 'time_entries', 'contacts', 'all']).default('all'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeArchived: z.boolean().default(false),
})

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

  const parsed = exportCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  }

  const { format, entityType, dateFrom, dateTo, includeArchived } = parsed.data

  // Create export job record
  const job = await db.exportJob.create({
    data: {
      userId: auth.user.id,
      type: 'export',
      format,
      entityType,
      status: 'pending',
    },
  })

  try {
    // Execute export synchronously (for now; async with BullMQ in production)
    await db.exportJob.update({
      where: { id: job.id },
      data: { status: 'processing', startedAt: new Date() },
    })

    const result = await executeExport({
      userId: auth.user.id,
      format: format as ExportFormat,
      entityType: entityType as EntityType,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      includeArchived,
    })

    await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        rowCount: result.rowCount,
        fileSize: result.fileSize,
        fileName: result.fileName,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h download window
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'export.create',
        target: entityType,
        metadata: JSON.stringify({ format, rowCount: result.rowCount, fileSize: result.fileSize }),
      },
    })

    // Return the file content directly for immediate download
    const contentType = format === 'csv' ? 'text/csv'
      : format === 'json' ? 'application/json'
      : 'text/html'

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'X-Export-Job-Id': job.id,
        'X-Export-Row-Count': String(result.rowCount),
      },
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
      { error: 'Erreur lors de l\'export', jobId: job.id },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const jobs = await db.exportJob.findMany({
    where: { userId: auth.user.id, type: 'export' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ jobs })
}
