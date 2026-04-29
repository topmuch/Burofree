/**
 * Worker Starter — starts all BullMQ workers when imported.
 * Only runs in Node.js runtime (not Edge).
 */

let workersStarted = false

export async function startWorkers() {
  if (workersStarted) return
  if (process.env.NEXT_RUNTIME === 'edge') return

  try {
    const { startCampaignWorker } = await import('@/features/campaigns/services/campaign-worker')
    const { startWorkflowWorker } = await import('@/features/automation/services/workflow-worker')

    startCampaignWorker()
    startWorkflowWorker()

    workersStarted = true
    console.log('[Workers] BullMQ workers started successfully')
  } catch (error) {
    console.warn('[Workers] Failed to start BullMQ workers (Redis may not be available):', error)
  }
}
