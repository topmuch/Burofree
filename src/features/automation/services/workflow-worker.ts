/**
 * BullMQ Worker for Workflow Execution
 * Processes delayed workflow actions and retry logic.
 */
import { Worker, Job } from 'bullmq'
import { redis } from '@/lib/redis'
import { workflowQueue } from '@/lib/queue'
import { executeWorkflow } from './workflow-engine'

interface WorkflowJob {
  workflowId: string
  executionId: string
  contactId?: string
  conversationId?: string
  dealId?: string
  userId: string
  teamId?: string
  eventData: Record<string, unknown>
}

/**
 * Process a workflow execution job.
 */
async function processWorkflowJob(job: Job<WorkflowJob>): Promise<void> {
  const { workflowId, contactId, conversationId, dealId, userId, teamId, eventData } = job.data

  await executeWorkflow(workflowId, {
    contactId,
    conversationId,
    dealId,
    userId,
    teamId,
    eventData,
  })
}

// Create the worker
export function startWorkflowWorker(): Worker<WorkflowJob> {
  const worker = new Worker<WorkflowJob>(
    'workflow-execution',
    processWorkflowJob,
    {
      connection: redis.duplicate(),
      concurrency: 5,
    },
  )

  worker.on('completed', (job) => {
    console.log(`[WorkflowWorker] Job ${job.id} completed — workflow ${job.data.workflowId}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[WorkflowWorker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

/**
 * Queue a workflow for delayed execution.
 * Used by the workflow engine when encountering a delay.hours action.
 */
export async function queueDelayedWorkflow(
  workflowId: string,
  executionId: string,
  delayMs: number,
  context: {
    contactId?: string
    conversationId?: string
    dealId?: string
    userId: string
    teamId?: string
    eventData: Record<string, unknown>
  },
): Promise<void> {
  await workflowQueue.add(
    'delayed-workflow',
    {
      workflowId,
      executionId,
      ...context,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  )
}
