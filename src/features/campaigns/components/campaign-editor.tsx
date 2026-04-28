/**
 * Campaign Editor Component
 * Form for creating and editing email campaigns with CAN-SPAM compliance.
 */
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Label, Textarea, Switch, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui'
import { Send, Eye, Calendar, Mail, Shield, AlertTriangle, Save, Zap } from 'lucide-react'
import { useCreateCampaign, useUpdateCampaign, useSendCampaign } from '../hooks/use-campaigns'
import { toast } from 'sonner'

interface CampaignEditorProps {
  campaign?: Record<string, unknown> | null
  onClose?: () => void
}

const STATUS_BADGES: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  sending: { label: 'Sending', variant: 'default' },
  sent: { label: 'Sent', variant: 'default' },
  paused: { label: 'Paused', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function CampaignEditor({ campaign, onClose }: CampaignEditorProps) {
  const isEditing = !!campaign?.id
  const createMutation = useCreateCampaign()
  const updateMutation = useUpdateCampaign()
  const sendMutation = useSendCampaign()

  const [name, setName] = useState((campaign?.name as string) || '')
  const [subject, setSubject] = useState((campaign?.subject as string) || '')
  const [fromName, setFromName] = useState((campaign?.fromName as string) || '')
  const [fromEmail, setFromEmail] = useState((campaign?.fromEmail as string) || '')
  const [previewText, setPreviewText] = useState((campaign?.previewText as string) || '')
  const [contentHtml, setContentHtml] = useState((campaign?.contentHtml as string) || '')
  const [senderAddress, setSenderAddress] = useState((campaign?.senderAddress as string) || '')
  const [listUnsubscribe, setListUnsubscribe] = useState((campaign?.listUnsubscribe as boolean) ?? true)
  const [doubleOptIn, setDoubleOptIn] = useState((campaign?.doubleOptIn as boolean) ?? false)
  const [throttlePerHour, setThrottlePerHour] = useState((campaign?.throttlePerHour as number) || 0)
  const [showPreview, setShowPreview] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  const isSaving = createMutation.isPending || updateMutation.isPending
  const canSpamIssues: string[] = []
  if (!senderAddress) canSpamIssues.push('Physical address required')
  if (!fromEmail) canSpamIssues.push('From email required')
  if (!subject) canSpamIssues.push('Subject line required')

  const handleSave = async (status?: string) => {
    const data: Record<string, unknown> = {
      name,
      subject,
      fromName: fromName || undefined,
      fromEmail: fromEmail || undefined,
      previewText: previewText || undefined,
      contentHtml: contentHtml || undefined,
      senderAddress: senderAddress || undefined,
      listUnsubscribe,
      doubleOptIn,
      throttlePerHour,
    }
    if (status) data.status = status

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: campaign!.id as string, data })
        toast.success('Campaign updated')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Campaign created')
      }
      onClose?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save campaign')
    }
  }

  const handleSend = async () => {
    if (canSpamIssues.length > 0) {
      toast.error('Fix CAN-SPAM issues before sending')
      return
    }
    try {
      await sendMutation.mutateAsync({ id: campaign!.id as string, action: 'now' })
      toast.success('Campaign sent!')
      onClose?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send')
    }
  }

  const status = (campaign?.status as string) || 'draft'
  const statusBadge = STATUS_BADGES[status]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">
            {isEditing ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          {isEditing && statusBadge && (
            <Badge variant={statusBadge.variant} className={
              status === 'sending' ? 'animate-pulse bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              status === 'scheduled' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              ''
            }>
              {statusBadge.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? 'Editor' : 'Preview'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Draft
          </Button>
          {isEditing && ['draft', 'scheduled'].includes(status) && (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sendMutation.isPending || canSpamIssues.length > 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="h-4 w-4 mr-1" />
              Send Now
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          {showPreview ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border border-zinc-800 rounded-lg overflow-hidden"
            >
              <div className="flex items-center gap-2 p-2 border-b border-zinc-800 bg-zinc-900/50">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                >
                  Desktop
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                >
                  Mobile
                </Button>
              </div>
              <div className={`mx-auto bg-white ${previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
                <div className="p-4 border-b border-zinc-200">
                  <p className="text-xs text-zinc-500">From: {fromName || 'Sender'} &lt;{fromEmail || 'email@example.com'}&gt;</p>
                  <p className="text-sm font-medium text-zinc-900">{subject || 'Subject line'}</p>
                  {previewText && <p className="text-xs text-zinc-400 italic">{previewText}</p>}
                </div>
                <div
                  className="p-4 min-h-64 text-zinc-800 text-sm"
                  dangerouslySetInnerHTML={{ __html: contentHtml || '<p style="color:#999">No content yet</p>' }}
                />
              </div>
            </motion.div>
          ) : (
            <>
              {/* Basic Info */}
              <Card className="bg-zinc-950/30 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Campaign Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-zinc-400 text-xs">Campaign Name</Label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Welcome Series #1"
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs">Subject Line</Label>
                    <Input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Your subject line here..."
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs">Preview Text</Label>
                    <Input
                      value={previewText}
                      onChange={e => setPreviewText(e.target.value)}
                      placeholder="Short preview text shown in inbox..."
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-zinc-400 text-xs">From Name</Label>
                      <Input
                        value={fromName}
                        onChange={e => setFromName(e.target.value)}
                        placeholder="Sender name"
                        className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-xs">From Email</Label>
                      <Input
                        value={fromEmail}
                        onChange={e => setFromEmail(e.target.value)}
                        placeholder="sender@example.com"
                        type="email"
                        className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content */}
              <Card className="bg-zinc-950/30 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-zinc-300">Email Content (HTML)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={contentHtml}
                    onChange={e => setContentHtml(e.target.value)}
                    placeholder="<html>...your email HTML...</html>"
                    className="bg-zinc-900/50 border-zinc-700 text-zinc-100 font-mono text-xs min-h-64"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Use {'{{variable}}'} syntax for dynamic content. Available: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}, {'{{unsubscribeUrl}}'}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* CAN-SPAM Compliance */}
          <Card className="bg-zinc-950/30 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" /> CAN-SPAM Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canSpamIssues.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
                  {canSpamIssues.map((issue, i) => (
                    <p key={i} className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {issue}
                    </p>
                  ))}
                </div>
              )}
              <div>
                <Label className="text-zinc-400 text-xs">Physical Address</Label>
                <Input
                  value={senderAddress}
                  onChange={e => setSenderAddress(e.target.value)}
                  placeholder="123 Main St, City, ST 12345"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs">List-Unsubscribe Header</Label>
                <Switch checked={listUnsubscribe} onCheckedChange={setListUnsubscribe} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs">Double Opt-In</Label>
                <Switch checked={doubleOptIn} onCheckedChange={setDoubleOptIn} />
              </div>
            </CardContent>
          </Card>

          {/* Sending Options */}
          <Card className="bg-zinc-950/30 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" /> Sending Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-zinc-400 text-xs">Throttle (emails/hour)</Label>
                <Input
                  type="number"
                  value={throttlePerHour}
                  onChange={e => setThrottlePerHour(parseInt(e.target.value) || 0)}
                  placeholder="0 = unlimited"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                />
                <p className="text-xs text-zinc-500 mt-1">0 = unlimited</p>
              </div>
              {isEditing && (
                <div className="pt-2 space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSend}
                    disabled={sendMutation.isPending || canSpamIssues.length > 0}
                  >
                    <Send className="h-4 w-4 mr-1" /> Send Now
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full border-zinc-700 text-zinc-300">
                        <Calendar className="h-4 w-4 mr-1" /> Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-950 border-zinc-800">
                      <DialogHeader>
                        <DialogTitle className="text-zinc-100">Schedule Campaign</DialogTitle>
                      </DialogHeader>
                      <p className="text-zinc-400 text-sm">Schedule functionality — select a date and time for your campaign.</p>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
