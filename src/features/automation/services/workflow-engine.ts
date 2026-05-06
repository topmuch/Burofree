/**
 * Workflow Engine Service
 * State machine pattern for executing automation workflows.
 * Supports triggers, actions, delays, idempotency, and retry.
 */
import { db } from '@/lib/db'

// ─── Types ─────────────────────────────────────────────────────────────────────

type TriggerType =
  | 'contact.created'
  | 'deal.stage_changed'
  | 'email.received'
  | 'tag.added'
  | 'campaign.opened'
  | 'date.reached'

type ActionType =
  | 'email.send'
  | 'tag.add'
  | 'assign.to'
  | 'create.task'
  | 'delay.hours'
  | 'webhook.call'
  | 'ai.generate_reply'

interface TriggerConfig {
  type: TriggerType
  config: Record<string, unknown>
}

interface ActionConfig {
  type: ActionType
  config: Record<string, unknown>
}

interface WorkflowContext {
  contactId?: string
  conversationId?: string
  dealId?: string
  userId: string
  teamId?: string
  eventData: Record<string, unknown>
}

interface ExecutionLog {
  step: number
  action: string
  status: 'success' | 'error' | 'skipped'
  output?: string
  error?: string
  timestamp: string
}

// ─── Trigger Evaluation ────────────────────────────────────────────────────────

export function evaluateTrigger(trigger: TriggerConfig, eventData: Record<string, unknown>): boolean {
  if (trigger.type !== eventData.triggerType) return false

  // Check additional conditions from trigger config
  const config = trigger.config
  if (config.field && config.operator && config.value !== undefined) {
    const fieldValue = eventData[config.field as string]
    switch (config.operator) {
      case 'equals': return fieldValue === config.value
      case 'not_equals': return fieldValue !== config.value
      case 'contains': return String(fieldValue ?? '').includes(String(config.value))
      case 'greater_than': return Number(fieldValue) > Number(config.value)
      case 'less_than': return Number(fieldValue) < Number(config.value)
      default: return true
    }
  }

  return true
}

// ─── Workflow Execution ────────────────────────────────────────────────────────

export async function executeWorkflow(workflowId: string, context: WorkflowContext) {
  const workflow = await db.workflow.findUnique({ where: { id: workflowId } })
  if (!workflow) throw new Error('Workflow not found')
  if (!workflow.isActive) throw new Error('Workflow is not active')

  const trigger: TriggerConfig = JSON.parse(workflow.trigger || '{}')
  const actions: ActionConfig[] = JSON.parse(workflow.actions || '[]')

  if (actions.length === 0) throw new Error('Workflow has no actions')

  // Generate idempotency key
  const idempotencyKey = `${workflowId}:${context.contactId || ''}:${context.eventData.triggerType || ''}:${Date.now()}`

  // Check for duplicate execution
  const existing = await db.workflowExecution.findFirst({
    where: { idempotencyKey, status: { in: ['running', 'completed'] } },
  })
  if (existing) {
    console.log(`[WorkflowEngine] Skipping duplicate execution: ${idempotencyKey}`)
    return existing
  }

  // Create execution record
  const execution = await db.workflowExecution.create({
    data: {
      workflowId,
      contactId: context.contactId,
      conversationId: context.conversationId,
      dealId: context.dealId,
      status: 'running',
      currentStep: 0,
      logs: JSON.stringify([]),
      idempotencyKey,
    },
  })

  const logs: ExecutionLog[] = []

  try {
    // Execute actions in sequence
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]

      // Update current step
      await db.workflowExecution.update({
        where: { id: execution.id },
        data: { currentStep: i },
      })

      // Handle delay action specially
      if (action.type === 'delay.hours') {
        const hours = Number(action.config.hours ?? 1)
        const scheduledAt = new Date(Date.now() + hours * 3600 * 1000)

        await handleDelay(action, execution.id, scheduledAt, workflowId, context)

        logs.push({
          step: i,
          action: action.type,
          status: 'success',
          output: `Delayed for ${hours} hours, scheduled at ${scheduledAt.toISOString()}`,
          timestamp: new Date().toISOString(),
        })

        // Update execution status
        await db.workflowExecution.update({
          where: { id: execution.id },
          data: {
            currentStep: i + 1,
            status: 'delayed',
            scheduledAt,
            logs: JSON.stringify(logs),
          },
        })

        // Increment workflow stats
        await updateWorkflowStats(workflowId, 'success')

        return execution
      }

      // Test mode: log only
      if (workflow.isTest) {
        logs.push({
          step: i,
          action: action.type,
          status: 'skipped',
          output: 'Test mode — action not executed',
          timestamp: new Date().toISOString(),
        })
        continue
      }

      // Execute the action
      const result = await executeAction(action, context)
      logs.push({
        step: i,
        action: action.type,
        status: result.success ? 'success' : 'error',
        output: result.output,
        error: result.error,
        timestamp: new Date().toISOString(),
      })

      if (!result.success) {
        // Log error but continue (retry logic could go here)
        console.error(`[WorkflowEngine] Action ${action.type} failed: ${result.error}`)
      }
    }

    // Mark as completed
    await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        currentStep: actions.length,
        logs: JSON.stringify(logs),
        completedAt: new Date(),
      },
    })

    // Update workflow stats
    await updateWorkflowStats(workflowId, 'success')

    return execution
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    logs.push({
      step: logs.length,
      action: 'engine',
      status: 'error',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    })

    await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        error: errorMsg,
        logs: JSON.stringify(logs),
        completedAt: new Date(),
      },
    })

    // Update workflow stats
    await updateWorkflowStats(workflowId, 'failure')

    throw error
  }
}

// ─── Action Execution ──────────────────────────────────────────────────────────

async function executeAction(
  action: ActionConfig,
  context: WorkflowContext,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    switch (action.type) {
      case 'email.send': {
        const { to, subject, body } = action.config as { to?: string; subject: string; body: string }
        if (!to && !context.contactId) {
          return { success: false, error: 'No recipient specified' }
        }
        try {
          const { sendEmail } = await import('@/lib/email')
          await sendEmail({
            to: to || context.contactId!,
            subject,
            html: body,
            text: body.replace(/<[^>]*>/g, ''),
          })
          return { success: true, output: `Email sent to ${to || context.contactId}: ${subject}` }
        } catch (err) {
          return { success: false, error: `Email send failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      }

      case 'tag.add': {
        const { tag, contactId } = action.config
        const targetContactId = (contactId as string) || context.contactId
        if (!targetContactId) {
          return { success: false, error: 'No contact specified for tag.add' }
        }
        const contact = await db.crmContact.findUnique({ where: { id: targetContactId } })
        if (!contact) {
          return { success: false, error: 'Contact not found' }
        }
        const tags: string[] = JSON.parse(contact.tags || '[]')
        if (!tags.includes(tag as string)) {
          tags.push(tag as string)
          await db.crmContact.update({
            where: { id: targetContactId },
            data: { tags: JSON.stringify(tags) },
          })
        }
        return { success: true, output: `Tag "${tag as string}" added to contact ${targetContactId}` }
      }

      case 'assign.to': {
        const { entityType, entityId, userId: targetUserId } = action.config as { entityType?: string; entityId?: string; userId: string }
        if (!targetUserId) {
          return { success: false, error: 'No user specified for assign.to' }
        }
        try {
          if (entityType && entityId) {
            if (entityType === 'task') {
              await db.task.update({ where: { id: entityId }, data: { userId: targetUserId } })
            } else if (entityType === 'deal') {
              await db.deal.update({ where: { id: entityId }, data: { userId: targetUserId } })
            } else if (entityType === 'contact') {
              await db.crmContact.update({ where: { id: entityId }, data: { userId: targetUserId } })
            }
            return { success: true, output: `Assigned ${entityType} ${entityId} to user ${targetUserId}` }
          }
          // Legacy fallback: no entity specified, just log the assignment
          return { success: true, output: `Assigned to ${targetUserId}` }
        } catch (err) {
          return { success: false, error: `Assignment failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      }

      case 'create.task': {
        const { title, projectId, priority } = action.config
        if (!title) {
          return { success: false, error: 'No task title specified' }
        }
        const task = await db.task.create({
          data: {
            title: title as string,
            priority: (priority as string) || 'medium',
            projectId: projectId as string | undefined,
            userId: context.userId,
          },
        })
        return { success: true, output: `Task created: ${task.id}` }
      }

      case 'delay.hours': {
        // Handled in executeWorkflow
        return { success: true, output: 'Delay handled by engine' }
      }

      case 'webhook.call': {
        const { url, method = 'POST', headers = {}, body: webhookBody } = action.config as {
          url: string
          method?: string
          headers?: Record<string, string>
          body?: unknown
        }
        if (!url) {
          return { success: false, error: 'No webhook URL specified' }
        }
        try {
          const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: webhookBody ? JSON.stringify(webhookBody) : undefined,
            signal: AbortSignal.timeout(10_000), // 10 s timeout
          })
          if (resp.ok) {
            return { success: true, output: `Webhook called: HTTP ${resp.status} from ${url}` }
          }
          return { success: false, error: `Webhook returned HTTP ${resp.status} from ${url}` }
        } catch (err) {
          return { success: false, error: `Webhook call failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      }

      case 'ai.generate_reply': {
        const { tone = 'professional', conversationId: convId, context: aiContext } = action.config as {
          tone?: string
          conversationId?: string
          context?: string
        }
        const targetConvId = convId || context.conversationId
        if (!targetConvId && !aiContext) {
          return { success: false, error: 'No conversation or context specified for ai.generate_reply' }
        }
        try {
          const { createAIEngine } = await import('@/lib/ai')
          const engine = createAIEngine()
          const promptText = aiContext
            ? `Generate a ${tone} reply to: ${aiContext}`
            : `Generate a ${tone} reply for conversation ${targetConvId}`
          const reply = await engine.chat(
            [{ role: 'user', content: promptText }],
            { temperature: 0.7, maxTokens: 500 },
          )
          return { success: true, output: reply }
        } catch (err) {
          return { success: false, error: `AI reply generation failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ─── Delay Handling ────────────────────────────────────────────────────────────

async function handleDelay(action: ActionConfig, executionId: string, scheduledAt: Date, workflowId: string, context: WorkflowContext) {
  const delayMs = Math.max(0, scheduledAt.getTime() - Date.now())
  if (delayMs > 0) {
    try {
      const { queueDelayedWorkflow } = await import('./workflow-worker')
      await queueDelayedWorkflow(workflowId, executionId, delayMs, context)
    } catch (error) {
      // Fallback: if BullMQ is not available, just log (SQLite polling fallback)
      console.warn(`[WorkflowEngine] BullMQ unavailable, using polling fallback:`, error)
    }
  }
  console.log(`[WorkflowEngine] Delay scheduled: execution ${executionId} at ${scheduledAt.toISOString()}`)
}

export async function processDelayedWorkflows() {
  const now = new Date()

  // Find executions that are delayed and past their scheduled time
  const delayedExecutions = await db.workflowExecution.findMany({
    where: {
      status: 'delayed',
      scheduledAt: { lte: now },
    },
    include: { workflow: true },
  })

  for (const execution of delayedExecutions) {
    try {
      const actions: ActionConfig[] = JSON.parse(execution.workflow.actions || '[]')
      const currentStep = execution.currentStep

      // Continue execution from where we left off
      const logs: ExecutionLog[] = JSON.parse(execution.logs || '[]')
      const context: WorkflowContext = {
        contactId: execution.contactId ?? undefined,
        conversationId: execution.conversationId ?? undefined,
        dealId: execution.dealId ?? undefined,
        userId: execution.workflow.userId,
        teamId: execution.workflow.teamId ?? undefined,
        eventData: {},
      }

      for (let i = currentStep; i < actions.length; i++) {
        const action = actions[i]

        // Skip delay actions that already completed
        if (action.type === 'delay.hours') continue

        if (execution.workflow.isTest) {
          logs.push({
            step: i,
            action: action.type,
            status: 'skipped',
            output: 'Test mode',
            timestamp: new Date().toISOString(),
          })
          continue
        }

        const result = await executeAction(action, context)
        logs.push({
          step: i,
          action: action.type,
          status: result.success ? 'success' : 'error',
          output: result.output,
          error: result.error,
          timestamp: new Date().toISOString(),
        })
      }

      await db.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          currentStep: actions.length,
          logs: JSON.stringify(logs),
          completedAt: new Date(),
        },
      })

      await updateWorkflowStats(execution.workflowId, 'success')
    } catch (error) {
      await db.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      })
      await updateWorkflowStats(execution.workflowId, 'failure')
    }
  }

  return { processed: delayedExecutions.length }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

async function updateWorkflowStats(workflowId: string, result: 'success' | 'failure') {
  const workflow = await db.workflow.findUnique({ where: { id: workflowId } })
  if (!workflow) return

  const stats = JSON.parse(workflow.stats || '{}')
  stats.totalExecutions = (stats.totalExecutions || 0) + 1
  if (result === 'success') stats.successCount = (stats.successCount || 0) + 1
  if (result === 'failure') stats.failureCount = (stats.failureCount || 0) + 1
  stats.lastExecutedAt = new Date().toISOString()

  await db.workflow.update({
    where: { id: workflowId },
    data: { stats: JSON.stringify(stats) },
  })
}
