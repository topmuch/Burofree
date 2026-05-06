/**
 * Next.js Instrumentation — runs on server startup
 * Starts BullMQ workers and cron jobs.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return

  // Start BullMQ workers
  try {
    const { startWorkers } = await import('@/lib/workers')
    await startWorkers()
  } catch (error) {
    console.warn('[Instrumentation] Workers failed to start (Redis may not be available):', error)
  }
}
