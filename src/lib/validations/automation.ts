import { z } from 'zod'

// ─── Workflow Step Type ──────────────────────────────────────────────────

export interface WorkflowStep {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
}

// ─── Workflow Trigger Schema ─────────────────────────────────────────────

const workflowTriggerSchema = z.object({
  type: z.enum([
    'contact.created',
    'contact.updated',
    'deal.stage_changed',
    'deal.status_changed',
    'email.received',
    'email.opened',
    'tag.added',
    'campaign.opened',
    'date.reached',
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
})

// ─── Workflow Action Schema ──────────────────────────────────────────────

const workflowActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'email.send',
    'tag.add',
    'tag.remove',
    'assign.to',
    'create.task',
    'delay.hours',
    'webhook.call',
    'ai.generate_reply',
    'update.field',
    'deal.update',
    'contact.update',
    'wait',
    'condition',
    'notification.send',
  ]),
  name: z.string().min(1).max(200),
  config: z.record(z.string(), z.unknown()).default({}),
})

// ─── Workflow Create Schema ──────────────────────────────────────────────

export const workflowCreateSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(200),
  description: z.string().max(2000).optional(),
  trigger: workflowTriggerSchema,
  actions: z.array(workflowActionSchema).min(1, 'At least one action is required'),
  isActive: z.boolean().default(true),
  isTest: z.boolean().default(false),
})

export type WorkflowCreateInput = z.infer<typeof workflowCreateSchema>

// ─── Workflow Update Schema (partial of create) ──────────────────────────

export const workflowUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  trigger: workflowTriggerSchema.optional(),
  actions: z.array(workflowActionSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  isTest: z.boolean().optional(),
})

export type WorkflowUpdateInput = z.infer<typeof workflowUpdateSchema>

// ─── Workflow Query Schema ───────────────────────────────────────────────

export const workflowQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  triggerType: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type WorkflowQueryInput = z.infer<typeof workflowQuerySchema>

// ─── Workflow Execute Schema ─────────────────────────────────────────────

export const workflowExecuteSchema = z.object({
  triggerData: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().optional(),
})

export type WorkflowExecuteInput = z.infer<typeof workflowExecuteSchema>

// ─── Execution Query Schema ──────────────────────────────────────────────

export const executionQuerySchema = z.object({
  status: z.enum(['running', 'completed', 'failed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type ExecutionQueryInput = z.infer<typeof executionQuerySchema>
