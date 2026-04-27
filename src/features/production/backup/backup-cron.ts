/**
 * Backup Cron Scheduler — Automated backup execution
 *
 * Runs backups on schedule:
 * - Hourly: every 6 hours (incremental-style, lightweight)
 * - Daily: once per day at 02:00
 * - Weekly: Sunday at 03:00
 * - Retention enforcement: daily at 04:00
 */

import { executeBackup, enforceRetentionPolicy, getBackupHealth } from './backup-manager'

let cronInterval: ReturnType<typeof setInterval> | null = null
const BACKUP_CHECK_INTERVAL = 60 * 60 * 1000 // Check every hour

interface CronState {
  lastHourly: number
  lastDaily: number
  lastWeekly: number
  lastRetention: number
}

const state: CronState = {
  lastHourly: 0,
  lastDaily: 0,
  lastWeekly: 0,
  lastRetention: 0,
}

/**
 * Initialize the backup cron scheduler.
 * Should be called once at server startup.
 */
export function initBackupCron(): void {
  if (cronInterval) return

  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_CRON) {
    console.log('[BackupCron] Disabled in development. Set ENABLE_CRON=true to enable.')
    return
  }

  console.log('[BackupCron] Initializing backup scheduler...')

  cronInterval = setInterval(async () => {
    await runScheduledBackups()
  }, BACKUP_CHECK_INTERVAL)

  // Run initial check after 5 minutes
  setTimeout(() => runScheduledBackups(), 5 * 60 * 1000)
}

/**
 * Run scheduled backups based on current time.
 */
async function runScheduledBackups(): Promise<void> {
  const now = Date.now()
  const hour = new Date().getHours()
  const day = new Date().getDay() // 0 = Sunday

  try {
    // Hourly backup (every 6 hours)
    if (now - state.lastHourly >= 6 * 60 * 60 * 1000) {
      console.log('[BackupCron] Running hourly backup...')
      const result = await executeBackup('hourly')
      if (result.status === 'completed') {
        console.log(`[BackupCron] Hourly backup completed: ${result.filePath} (${formatBytes(result.fileSize)})`)
      } else {
        console.error(`[BackupCron] Hourly backup failed: ${result.errorMessage}`)
      }
      state.lastHourly = now
    }

    // Daily backup at 02:00
    if (hour === 2 && now - state.lastDaily >= 24 * 60 * 60 * 1000) {
      console.log('[BackupCron] Running daily backup...')
      const result = await executeBackup('daily')
      if (result.status === 'completed') {
        console.log(`[BackupCron] Daily backup completed: ${result.filePath} (${formatBytes(result.fileSize)})`)
      } else {
        console.error(`[BackupCron] Daily backup failed: ${result.errorMessage}`)
      }
      state.lastDaily = now
    }

    // Weekly backup on Sunday at 03:00
    if (day === 0 && hour === 3 && now - state.lastWeekly >= 7 * 24 * 60 * 60 * 1000) {
      console.log('[BackupCron] Running weekly backup...')
      const result = await executeBackup('weekly')
      if (result.status === 'completed') {
        console.log(`[BackupCron] Weekly backup completed: ${result.filePath} (${formatBytes(result.fileSize)})`)
      } else {
        console.error(`[BackupCron] Weekly backup failed: ${result.errorMessage}`)
      }
      state.lastWeekly = now
    }

    // Retention enforcement at 04:00
    if (hour === 4 && now - state.lastRetention >= 24 * 60 * 60 * 1000) {
      console.log('[BackupCron] Enforcing retention policy...')
      const deleted = await enforceRetentionPolicy()
      console.log(`[BackupCron] Retention: ${deleted} expired snapshots removed`)
      state.lastRetention = now
    }
  } catch (error) {
    console.error('[BackupCron] Error in scheduled backups:', error)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Get current backup scheduler state (for admin dashboard).
 */
export function getBackupCronState(): CronState & { isRunning: boolean } {
  return {
    ...state,
    isRunning: cronInterval !== null,
  }
}
