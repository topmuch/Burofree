/**
 * Campaign Panel — Main export component
 * Tab view: Campaigns, Templates, Workflows
 */
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { Mail, FileText, Zap, Megaphone } from 'lucide-react'
import { CampaignDashboard } from './components/campaign-dashboard'
import { CampaignEditor } from './components/campaign-editor'
import { WorkflowBuilder } from '../automation/components/workflow-builder'
import { TemplateGallery } from '../automation/components/template-gallery'

export function CampaignPanel() {
  const [activeTab, setActiveTab] = useState('campaigns')
  const [editingCampaign, setEditingCampaign] = useState<Record<string, unknown> | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleNewCampaign = () => {
    setEditingCampaign(null)
    setShowEditor(true)
    setActiveTab('editor')
  }

  const handleEditCampaign = (id: string) => {
    // For now, set a minimal campaign object to open the editor
    setEditingCampaign({ id })
    setShowEditor(true)
    setActiveTab('editor')
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditingCampaign(null)
    setActiveTab('campaigns')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Campaigns & Automation</h1>
            <p className="text-sm text-zinc-400">Manage email campaigns, templates, and workflows</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-3">
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <Mail className="h-4 w-4 mr-1.5" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <FileText className="h-4 w-4 mr-1.5" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="workflows" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <Zap className="h-4 w-4 mr-1.5" />
              Workflows
            </TabsTrigger>
            {showEditor && (
              <TabsTrigger value="editor" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
                <Megaphone className="h-4 w-4 mr-1.5" />
                {editingCampaign ? 'Edit' : 'New'}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <TabsContent value="campaigns" className="mt-0">
              <CampaignDashboard
                onNewCampaign={handleNewCampaign}
                onEditCampaign={handleEditCampaign}
              />
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <TemplateGallery />
            </TabsContent>

            <TabsContent value="workflows" className="mt-0">
              <WorkflowBuilder />
            </TabsContent>

            {showEditor && (
              <TabsContent value="editor" className="mt-0">
                <CampaignEditor
                  campaign={editingCampaign}
                  onClose={handleEditorClose}
                />
              </TabsContent>
            )}
          </motion.div>
        </div>
      </Tabs>
    </div>
  )
}
