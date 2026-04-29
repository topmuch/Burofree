/**
 * Health Check API — System monitoring endpoint
 *
 * Returns database health, backup status, disk usage,
 * and application metrics. Used by monitoring tools and admin dashboard.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getBackupHealth } from '@/features/production/backup/backup-manager'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  const startTime = Date.now()

  try {
    // Database connectivity check
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart

    // Database size — compatible with both SQLite and PostgreSQL
    let dbSize = 0
    try {
      // Try SQLite first (our current provider)
      const sqliteResult = await db.$queryRaw<Array<{ page_count: bigint; page_size: bigint }>>`
        PRAGMA page_count
      `
      const sqlitePageSize = await db.$queryRaw<Array<{ page_size: bigint }>>`
        PRAGMA page_size
      `
      const pageCount = Number(sqliteResult[0]?.page_count || 0)
      const pageSize = Number(sqlitePageSize[0]?.page_size || 4096)
      dbSize = pageCount * pageSize
    } catch {
      // Fallback for PostgreSQL
      try {
        const pgResult = await db.$queryRaw<Array<{ pg_database_size: bigint }>>`
          SELECT pg_database_size(current_database()) as pg_database_size
        `
        dbSize = Number(pgResult[0]?.pg_database_size || 0)
      } catch {
        dbSize = 0
      }
    }

    // Active connections count — safely query sessions if model exists
    let activeUsers = 0
    try {
      activeUsers = await db.user.count({
        where: {
          sessions: {
            some: {
              expires: { gte: new Date() },
            },
          },
        },
      })
    } catch {
      activeUsers = 0
    }

    // Backup health
    let backupHealth
    try {
      backupHealth = await getBackupHealth()
    } catch {
      backupHealth = { lastBackup: null, lastBackupStatus: 'unknown', totalSnapshots: 0, totalSize: 0 }
    }

    // Disk usage (simplified)
    let diskUsage = { total: 0, used: 0, available: 0, percentage: 0 }
    try {
      const { stdout } = await execAsync('df -k / | tail -1')
      const parts = stdout.trim().split(/\s+/)
      if (parts.length >= 4) {
        diskUsage = {
          total: parseInt(parts[1], 10) * 1024,
          used: parseInt(parts[2], 10) * 1024,
          available: parseInt(parts[3], 10) * 1024,
          percentage: parseInt(parts[4], 10),
        }
      }
    } catch {
      // df not available (e.g., in some container environments)
    }

    // Alert conditions
    const alerts: Array<{ level: 'warning' | 'critical'; message: string }> = []

    if (diskUsage.percentage > 85) {
      alerts.push({ level: 'critical', message: `Espace disque critique: ${diskUsage.percentage}% utilisé` })
    } else if (diskUsage.percentage > 70) {
      alerts.push({ level: 'warning', message: `Espace disque bas: ${diskUsage.percentage}% utilisé` })
    }

    if (!backupHealth.lastBackup) {
      alerts.push({ level: 'warning', message: 'Aucune sauvegarde effectuée' })
    } else {
      const hoursSinceBackup = (Date.now() - backupHealth.lastBackup.getTime()) / (60 * 60 * 1000)
      if (hoursSinceBackup > 24) {
        alerts.push({ level: 'critical', message: `Dernière sauvegarde il y a ${Math.round(hoursSinceBackup)}h` })
      } else if (hoursSinceBackup > 12) {
        alerts.push({ level: 'warning', message: `Dernière sauvegarde il y a ${Math.round(hoursSinceBackup)}h` })
      }
    }

    if (dbLatency > 500) {
      alerts.push({ level: 'warning', message: `Latence base de données élevée: ${dbLatency}ms` })
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: alerts.some(a => a.level === 'critical') ? 'critical' : alerts.length > 0 ? 'warning' : 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      database: {
        status: 'connected',
        latency: dbLatency,
        size: dbSize,
        activeUsers,
      },
      backup: backupHealth,
      disk: diskUsage,
      alerts,
      version: process.env.npm_package_version || '0.4.0',
    })
  } catch (error) {
    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 })
  }
}
