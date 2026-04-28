/**
 * Workflow Trigger Service
 * Bridge between CRM events and workflow execution.
 * Emits events and finds matching workflows to execute.
 */
import { db } from '@/lib/db'
import { evaluateTrigger, executeWorkflow } from './workflow-engine'

// ─── Types ─────────────────────────────────────────────────────────────────────

type EventType =
  | 'contact.created'
  | 'deal.stage_changed'
  | 'email.received'
  | 'tag.added'
  | 'campaign.opened'
  | 'date.reached'

interface EventData {
  triggerType?: EventType
  [key: string]: unknown
}

// ─── Event Processing ──────────────────────────────────────────────────────────

/**
 * Emit an event and process all matching workflows.
 * This is the main entry point for triggering automations.
 */
export async function emitEvent(
  eventType: EventType,
  eventData: EventData,
  userId: string,
  teamId?: string,
) {
  return processEvent(eventType, { ...eventData, triggerType: eventType }, userId, teamId)
}

/**
 * Find all active workflows matching the event and execute them.
 */
export async function processEvent(
  eventType: EventType,
  eventData: EventData,
  userId: string,
  teamId?: string,
) {
  // Find all active workflows for this user/team
  const where: Record<string, unknown> = { isActive: true }
  if (teamId) {
    where.OR = [
      { userId, teamId: null },
      { teamId },
    ]
  } else {
    where.userId = userId
  }

  const workflows = await db.workflow.findMany({ where })

  const results: { workflowId: string; workflowName: string; executed: boolean; error?: string }[] = []

  for (const workflow of workflows) {
    try {
      const trigger = JSON.parse(workflow.trigger || '{}')

      // Check if trigger matches the event
      if (!evaluateTrigger(trigger, eventData)) continue

      // Build execution context
      const context = {
        contactId: eventData.contactId as string | undefined,
        conversationId: eventData.conversationId as string | undefined,
        dealId: eventData.dealId as string | undefined,
        userId: workflow.userId,
        teamId: workflow.teamId ?? undefined,
        eventData,
      }

      // Execute the workflow (non-blocking for performance)
      await executeWorkflow(workflow.id, context)

      results.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        executed: true,
      })
    } catch (error) {
      results.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        executed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

// ─── Convenience Methods ───────────────────────────────────────────────────────

export async function emitContactCreated(contactId: string, userId: string, teamId?: string) {
  return emitEvent('contact.created', { contactId }, userId, teamId)
}

export async function emitDealStageChanged(dealId: string, fromStage: string, toStage: string, userId: string, teamId?: string) {
  return emitEvent('deal.stage_changed', { dealId, fromStage, toStage }, userId, teamId)
}

export async function emitEmailReceived(conversationId: string, fromEmail: string, userId: string, teamId?: string) {
  return emitEvent('email.received', { conversationId, fromEmail }, userId, teamId)
}

export async function emitTagAdded(contactId: string, tag: string, userId: string, teamId?: string) {
  return emitEvent('tag.added', { contactId, tag }, userId, teamId)
}

export async function emitCampaignOpened(campaignId: string, contactId: string, userId: string, teamId?: string) {
  return emitEvent('campaign.opened', { campaignId, contactId }, userId, teamId)
}

export async function emitDateReached(dateType: string, entityId: string, userId: string, teamId?: string) {
  return emitEvent('date.reached', { dateType, entityId }, userId, teamId)
}
