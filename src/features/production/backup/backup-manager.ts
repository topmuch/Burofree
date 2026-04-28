/**
 * Backup Manager — Database backup and disaster recovery
 *
 * Handles pg_dump execution, AES-256-GCM encryption,
 * retention policy enforcement, and integrity verification.
 * Supports local Docker volume + optional S3-compatible sync.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync, statSync } from 'fs'
import { createHash } from 'crypto'
import { encrypt, decrypt } from '@/lib/crypto'
import { db } from '@/lib/db'
import { createGzip, gunzipSync } from 'zlib'
import { pipeline } from 'stream/promises'

const execAsync = promisify(exec)

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/maellis-backups'
const RETENTION_HOURLY_DAYS = 7
const RETENTION_DAILY_DAYS = 30
const RETENTION_WEEKLY_DAYS = 90

export type BackupType = 'hourly' | 'daily' | 'weekly' | 'manual'

export interface BackupResult {
  id: string
  type: BackupType
  filePath: string
  fileSize: number
  checksum: string
  status: 'completed' | 'failed'
  errorMessage?: string
}

/**
 * Execute a database backup using pg_dump.
 * Compresses with gzip and encrypts with AES-256-GCM.
 */
export async function executeBackup(type: BackupType): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const baseName = `maellis_${type}_${timestamp}`

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const sqlPath = `${BACKUP_DIR}/${baseName}.sql`
  const gzipPath = `${BACKUP_DIR}/${baseName}.sql.gz`
  const encPath = `${BACKUP_DIR}/${baseName}.sql.gz.enc`

  // Calculate retention date
  const retentionDays = type === 'hourly' ? RETENTION_HOURLY_DAYS
    : type === 'daily' ? RETENTION_DAILY_DAYS
    : type === 'weekly' ? RETENTION_WEEKLY_DAYS
    : 365 // Manual backups kept for 1 year

  const retentionUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)

  try {
    // Step 1: pg_dump
    const dbUrl = process.env.DATABASE_URL || ''
    let dumpCmd: string

    if (dbUrl.startsWith('file:')) {
      // SQLite backup
      dumpCmd = `sqlite3 "${dbUrl.replace('file:', '')}" ".dump"`
    } else {
      // PostgreSQL backup
      dumpCmd = `pg_dump "${dbUrl}" --no-owner --no-acl --format=plain`
    }

    const { stdout, stderr } = await execAsync(dumpCmd, {
      maxBuffer: 500 * 1024 * 1024, // 500MB buffer
      timeout: 10 * 60 * 1000, // 10 minute timeout
    })

    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('[Backup] pg_dump warnings:', stderr)
    }

    // Step 2: Write SQL to file
    const { writeFileSync } = await import('fs')
    writeFileSync(sqlPath, stdout, 'utf8')

    // Step 3: Compress with gzip
    await compressFile(sqlPath, gzipPath)

    // Step 4: Encrypt
    await encryptFile(gzipPath, encPath)

    // Step 5: Calculate checksum
    const checksum = await calculateChecksum(encPath)
    const fileStats = statSync(encPath)

    // Step 6: Clean up intermediate files
    try { unlinkSync(sqlPath) } catch { /* ignore */ }
    try { unlinkSync(gzipPath) } catch { /* ignore */ }

    // Step 7: Record in database
    const snapshot = await db.backupSnapshot.create({
      data: {
        type,
        filePath: encPath,
        fileSize: fileStats.size,
        checksum,
        compressed: true,
        encrypted: true,
        status: 'completed',
        completedAt: new Date(),
        retentionUntil,
      },
    })

    // Step 8: Optional S3 sync
    await syncToS3(encPath, baseName)

    return {
      id: snapshot.id,
      type,
      filePath: encPath,
      fileSize: fileStats.size,
      checksum,
      status: 'completed',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    // Record failure
    await db.backupSnapshot.create({
      data: {
        type,
        filePath: encPath,
        fileSize: 0,
        checksum: '',
        compressed: true,
        encrypted: true,
        status: 'failed',
        errorMessage,
        retentionUntil,
      },
    })

    return {
      id: '',
      type,
      filePath: encPath,
      fileSize: 0,
      checksum: '',
      status: 'failed',
      errorMessage,
    }
  }
}

/**
 * Restore from a backup snapshot.
 * Decrypts, decompresses, and executes the SQL.
 * IMPORTANT: This is a destructive operation — requires owner role + confirmation.
 */
export async function restoreFromBackup(
  snapshotId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const snapshot = await db.backupSnapshot.findUnique({
    where: { id: snapshotId },
  })

  if (!snapshot) {
    return { success: false, error: 'Snapshot non trouvé' }
  }

  if (!existsSync(snapshot.filePath)) {
    return { success: false, error: 'Fichier de backup introuvable' }
  }

  // Verify checksum
  const currentChecksum = await calculateChecksum(snapshot.filePath)
  if (currentChecksum !== snapshot.checksum) {
    return { success: false, error: 'Checksum invalide — le fichier a été corrompu' }
  }

  try {
    const decPath = `${snapshot.filePath}.dec`
    const gzipPath = `${snapshot.filePath}.gz`
    const sqlPath = `${snapshot.filePath}.sql`

    // Step 1: Decrypt
    await decryptFile(snapshot.filePath, decPath)

    // Step 2: Decompress
    const { readFileSync, writeFileSync } = await import('fs')
    const compressedData = readFileSync(decPath)
    const decompressedData = gunzipSync(compressedData)
    writeFileSync(sqlPath, decompressedData, 'utf8')

    // Step 3: Execute SQL restore
    const dbUrl = process.env.DATABASE_URL || ''
    let restoreCmd: string

    if (dbUrl.startsWith('file:')) {
      // SQLite restore
      restoreCmd = `sqlite3 "${dbUrl.replace('file:', '')}" < "${sqlPath}"`
    } else {
      // PostgreSQL restore
      restoreCmd = `psql "${dbUrl}" < "${sqlPath}"`
    }

    await execAsync(restoreCmd, {
      timeout: 30 * 60 * 1000, // 30 minute timeout
    })

    // Step 4: Clean up
    try { unlinkSync(decPath) } catch { /* ignore */ }
    try { unlinkSync(gzipPath) } catch { /* ignore */ }
    try { unlinkSync(sqlPath) } catch { /* ignore */ }

    // Audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'backup.restore',
        target: 'backup',
        targetId: snapshotId,
        metadata: JSON.stringify({ type: snapshot.type, filePath: snapshot.filePath }),
      },
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la restauration',
    }
  }
}

/**
 * Enforce retention policy — delete expired backups.
 */
export async function enforceRetentionPolicy(): Promise<number> {
  const now = new Date()
  const expired = await db.backupSnapshot.findMany({
    where: {
      retentionUntil: { lte: now },
      status: 'completed',
    },
  })

  let deletedCount = 0

  for (const snapshot of expired) {
    try {
      // Delete file
      if (existsSync(snapshot.filePath)) {
        unlinkSync(snapshot.filePath)
      }

      // Delete S3 copy
      await deleteFromS3(snapshot.filePath)

      // Delete record
      await db.backupSnapshot.delete({ where: { id: snapshot.id } })
      deletedCount++
    } catch (error) {
      console.error(`[Backup] Failed to delete expired snapshot ${snapshot.id}:`, error)
    }
  }

  return deletedCount
}

/**
 * Get backup health status and metrics.
 */
export async function getBackupHealth(): Promise<{
  lastBackup: Date | null
  lastBackupStatus: string
  totalSnapshots: number
  totalSize: number
  nextScheduled: Date | null
  diskUsage: number
}> {
  const lastSnapshot = await db.backupSnapshot.findFirst({
    where: { status: 'completed' },
    orderBy: { completedAt: 'desc' },
  })

  const stats = await db.backupSnapshot.aggregate({
    _count: true,
    _sum: { fileSize: true },
    where: { status: 'completed' },
  })

  // Calculate next scheduled backup
  const now = new Date()
  const nextHourly = new Date(now)
  nextHourly.setHours(nextHourly.getHours() + 1, 0, 0, 0)

  return {
    lastBackup: lastSnapshot?.completedAt || null,
    lastBackupStatus: lastSnapshot?.status || 'never',
    totalSnapshots: stats._count,
    totalSize: stats._sum.fileSize || 0,
    nextScheduled: nextHourly,
    diskUsage: stats._sum.fileSize || 0,
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function compressFile(inputPath: string, outputPath: string): Promise<void> {
  const { createReadStream, createWriteStream } = await import('fs')
  const gzip = createGzip({ level: 9 })
  const source = createReadStream(inputPath)
  const dest = createWriteStream(outputPath)

  await pipeline(source, gzip, dest)
}

async function encryptFile(inputPath: string, outputPath: string): Promise<void> {
  const { readFileSync, writeFileSync } = await import('fs')
  const data = readFileSync(inputPath, 'utf8')
  const encrypted = encrypt(data)
  writeFileSync(outputPath, encrypted, 'utf8')
}

async function decryptFile(inputPath: string, outputPath: string): Promise<void> {
  const { readFileSync, writeFileSync } = await import('fs')
  const encryptedData = readFileSync(inputPath, 'utf8')
  const decrypted = decrypt(encryptedData)
  writeFileSync(outputPath, decrypted, 'utf8')
}

async function calculateChecksum(filePath: string): Promise<string> {
  const { readFileSync } = await import('fs')
  const data = readFileSync(filePath)
  return createHash('sha256').update(data).digest('hex')
}

async function syncToS3(filePath: string, name: string): Promise<void> {
  const s3Endpoint = process.env.BACKUP_S3_ENDPOINT
  const s3Bucket = process.env.BACKUP_S3_BUCKET
  const s3AccessKey = process.env.BACKUP_S3_ACCESS_KEY
  const s3SecretKey = process.env.BACKUP_S3_SECRET_KEY

  if (!s3Endpoint || !s3Bucket || !s3AccessKey || !s3SecretKey) {
    return // S3 not configured — skip
  }

  try {
    const s3Path = `s3://${s3Bucket}/backups/${name}.sql.gz.enc`
    await execAsync(
      `AWS_ACCESS_KEY_ID=${s3AccessKey} AWS_SECRET_ACCESS_KEY=${s3SecretKey} ` +
      `aws s3 cp "${filePath}" "${s3Path}" --endpoint-url="${s3Endpoint}"`,
      { timeout: 10 * 60 * 1000 }
    )
  } catch (error) {
    console.error('[Backup] S3 sync failed:', error)
    // Non-fatal — local backup still exists
  }
}

async function deleteFromS3(filePath: string): Promise<void> {
  const s3Endpoint = process.env.BACKUP_S3_ENDPOINT
  const s3Bucket = process.env.BACKUP_S3_BUCKET
  const s3AccessKey = process.env.BACKUP_S3_ACCESS_KEY
  const s3SecretKey = process.env.BACKUP_S3_SECRET_KEY

  if (!s3Endpoint || !s3Bucket) return

  try {
    const fileName = filePath.split('/').pop()
    const s3Path = `s3://${s3Bucket}/backups/${fileName}`
    await execAsync(
      `AWS_ACCESS_KEY_ID=${s3AccessKey || ''} AWS_SECRET_ACCESS_KEY=${s3SecretKey || ''} ` +
      `aws s3 rm "${s3Path}" --endpoint-url="${s3Endpoint}"`,
      { timeout: 60000 }
    )
  } catch {
    // Non-fatal
  }
}
