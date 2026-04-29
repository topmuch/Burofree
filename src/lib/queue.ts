import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

// Campaign sending queue — throttled by throttlePerHour
export const campaignQueue = new Queue('campaign-sending', {
  connection: redis.duplicate(), // BullMQ needs a dedicated connection
})

// Workflow execution queue — for delayed actions
export const workflowQueue = new Queue('workflow-execution', {
  connection: redis.duplicate(),
})

// General background jobs queue
export const backgroundQueue = new Queue('background-jobs', {
  connection: redis.duplicate(),
})
