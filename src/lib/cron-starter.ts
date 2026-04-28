/**
 * Maellis Cron Starter
 * Call this from instrumentation.ts or root layout to start automated checks
 */
import { startAutomationCron } from './automation-cron'

let started = false

export function initCron() {
  if (started) return
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
    startAutomationCron()
    started = true
  }
}
