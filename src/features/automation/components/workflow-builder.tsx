/**
 * Workflow Builder Component
 * Card-based flow builder for creating automation workflows.
 */
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Input, Label, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Textarea,
} from '@/components/ui'
import {
  Zap, Plus, Trash2, Play, Pause, Mail, Tag, UserPlus, ListTodo, Clock,
  Globe, Bot, ArrowRight, TestTube, Eye, Settings2, ChevronDown,
} from 'lucide-react'
import { useWorkflows, useCreateWorkflow, useToggleWorkflow, useWorkflow } from '../../campaigns/hooks/use-campaigns'
import { toast } from 'sonner'

const TRIGGER_TYPES = [
  { value: 'contact.created', label: 'Contact Created', description: 'When a new contact is added', icon: UserPlus },
  { value: 'deal.stage_changed', label: 'Deal Stage Changed', description: 'When a deal moves to a new stage', icon: ArrowRight },
  { value: 'email.received', label: 'Email Received', description: 'When an email is received', icon: Mail },
  { value: 'tag.added', label: 'Tag Added', description: 'When a tag is added to a contact', icon: Tag },
  { value: 'campaign.opened', label: 'Campaign Opened', description: 'When a campaign email is opened', icon: Eye },
  { value: 'date.reached', label: 'Date Reached', description: 'On a specific date or schedule', icon: Clock },
]

const ACTION_TYPES = [
  { value: 'email.send', label: 'Send Email', icon: Mail, description: 'Send an email to a contact' },
  { value: 'tag.add', label: 'Add Tag', icon: Tag, description: 'Add a tag to a contact' },
  { value: 'assign.to', label: 'Assign To', icon: UserPlus, description: 'Assign contact to a user' },
  { value: 'create.task', label: 'Create Task', icon: ListTodo, description: 'Create a follow-up task' },
  { value: 'delay.hours', label: 'Delay', icon: Clock, description: 'Wait before next action' },
  { value: 'webhook.call', label: 'Call Webhook', icon: Globe, description: 'Send data to an external URL' },
  { value: 'ai.generate_reply', label: 'AI Reply', icon: Bot, description: 'Generate an AI response' },
]

export function WorkflowBuilder() {
  const { data, isLoading } = useWorkflows()
  const createMutation = useCreateWorkflow()
  const toggleMutation = useToggleWorkflow()
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTrigger, setNewTrigger] = useState(TRIGGER_TYPES[0].value)
  const [newActions, setNewActions] = useState([{ type: 'email.send', config: {} }])
  const [isTest, setIsTest] = useState(true)

  const workflows = data?.workflows ?? []

  const addAction = () => {
    setNewActions([...newActions, { type: 'email.send', config: {} }])
  }

  const removeAction = (index: number) => {
    setNewActions(newActions.filter((_, i) => i !== index))
  }

  const updateAction = (index: number, type: string) => {
    const updated = [...newActions]
    updated[index] = { type, config: {} }
    setNewActions(updated)
  }

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Workflow name is required')
      return
    }

    try {
      await createMutation.mutateAsync({
        name: newName,
        description: newDescription || undefined,
        trigger: { type: newTrigger, config: {} },
        actions: newActions,
        isActive: true,
        isTest,
      })
      toast.success('Workflow created')
      setShowBuilder(false)
      setNewName('')
      setNewDescription('')
      setNewActions([{ type: 'email.send', config: {} }])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create workflow')
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await toggleMutation.mutateAsync(id)
      toast.success('Workflow toggled')
    } catch (error) {
      toast.error('Failed to toggle')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Workflows</h2>
        <Button
          onClick={() => setShowBuilder(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" /> New Workflow
        </Button>
      </div>

      {/* Workflow Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Create Workflow</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Welcome New Contacts"
                className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
              />
              <Label className="text-zinc-300">Description</Label>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="What does this workflow do?"
                className="bg-zinc-900/50 border-zinc-700 text-zinc-100 min-h-16"
              />
            </div>

            {/* Trigger Card */}
            <Card className="bg-zinc-900/30 border-zinc-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" /> Trigger
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={newTrigger} onValueChange={setNewTrigger}>
                  <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className="h-3.5 w-3.5" /> {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500 mt-1">
                  {TRIGGER_TYPES.find(t => t.value === newTrigger)?.description}
                </p>
              </CardContent>
            </Card>

            {/* Action Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-sm">Actions</Label>
                <Button variant="ghost" size="sm" onClick={addAction} className="text-emerald-400">
                  <Plus className="h-3 w-3 mr-1" /> Add Action
                </Button>
              </div>
              <AnimatePresence>
                {newActions.map((action, index) => {
                  const actionDef = ACTION_TYPES.find(a => a.value === action.type)
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                    >
                      <Card className="bg-zinc-900/30 border-zinc-700">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 font-mono">{index + 1}.</span>
                            <Select
                              value={action.type}
                              onValueChange={v => updateAction(index, v)}
                            >
                              <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-100 h-8 text-xs flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800">
                                {ACTION_TYPES.map(a => (
                                  <SelectItem key={a.value} value={a.value}>
                                    <span className="flex items-center gap-2">
                                      <a.icon className="h-3 w-3" /> {a.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAction(index)}
                              className="text-rose-400 h-8 w-8 p-0"
                              disabled={newActions.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 ml-5">
                            {actionDef?.description}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Test Mode */}
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4 text-amber-400" />
                <div>
                  <Label className="text-zinc-300 text-sm">Test Mode</Label>
                  <p className="text-xs text-zinc-500">Actions will be logged but not executed</p>
                </div>
              </div>
              <Switch checked={isTest} onCheckedChange={setIsTest} />
            </div>

            {/* Create */}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newName.trim()}
            >
              <Zap className="h-4 w-4 mr-1" />
              {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workflow List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-zinc-950/30 border-zinc-800 animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card className="bg-zinc-950/30 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-zinc-300 font-medium">No workflows yet</h3>
            <p className="text-zinc-500 text-sm mt-1">Automate repetitive tasks with workflows.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {workflows.map((workflow: Record<string, unknown>) => {
            const trigger = JSON.parse((workflow.trigger as string) || '{}')
            const actions = JSON.parse((workflow.actions as string) || '[]')
            const stats = JSON.parse((workflow.stats as string) || '{}')
            const isActive = workflow.isActive as boolean
            const executionCount = (workflow as { _count?: { executions: number } })._count?.executions ?? 0
            const triggerDef = TRIGGER_TYPES.find(t => t.value === trigger.type)

            return (
              <motion.div
                key={workflow.id as string}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="bg-zinc-950/30 border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-zinc-100 truncate">
                            {workflow.name as string}
                          </h3>
                          {!!workflow.isTest && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30" variant="outline">
                              <TestTube className="h-3 w-3 mr-1" /> Test
                            </Badge>
                          )}
                          <Badge className={
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-500/20 text-zinc-400'
                          } variant="outline">
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {triggerDef?.label || trigger.type}
                          </span>
                          <ArrowRight className="h-3 w-3 text-zinc-600" />
                          <span className="text-xs text-zinc-500">
                            {actions.map((a: { type: string }) => {
                              const actionDef = ACTION_TYPES.find(at => at.value === a.type)
                              return actionDef?.label || a.type
                            }).join(' → ')}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-1">
                          {executionCount} executions
                          {stats.totalExecutions > 0 && ` · ${stats.successCount ?? 0} success · ${stats.failureCount ?? 0} failed`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(workflow.id as string)}
                          className={isActive ? 'text-amber-400' : 'text-emerald-400'}
                        >
                          {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
