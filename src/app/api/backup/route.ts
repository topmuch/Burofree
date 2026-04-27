/**
 * Backup API — List backups and trigger manual backup
 *
 * GET: List backup snapshots
 * POST: Trigger a manual backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { executeBackup, getBackupHealth } from '@/features/production/backup/backup-manager'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const health = await getBackupHealth()

  const snapshots = await db.backupSnapshot.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({
    health,
    snapshots: snapshots.map(s => ({
      id: s.id,
      type: s.type,
      fileSize: s.fileSize,
      compressed: s.compressed,
      encrypted: s.encrypted,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      errorMessage: s.errorMessage,
      retentionUntil: s.retentionUntil,
      createdAt: s.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimitId = getRateLimitIdentifier(req, auth.user.id)
  const rateCheck = checkRateLimit(rateLimitId, { maxRequests: 5, windowMs: 60 * 60 * 1000 }) // 5/hour
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Trop de sauvegardes manuelles. Maximum 5 par heure.' }, { status: 429 })
  }

  try {
    const result = await executeBackup('manual')

    // Audit log
    await db.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'backup.create',
        target: 'backup',
        targetId: result.id,
        metadata: JSON.stringify({ type: 'manual', fileSize: result.fileSize, status: result.status }),
      },
    })

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: 'Échec de la sauvegarde', details: result.errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      snapshot: result,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde' },
      { status: 500 }
    )
  }
}
