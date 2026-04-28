/**
 * Template Gallery Component
 * Grid of email templates with preview, create/edit, search, and variable extraction.
 */
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent,
  Button, Badge, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui'
import { Mail, Plus, Search, FileText, Code, Eye, Pencil } from 'lucide-react'
import { useEmailTemplates, useCreateEmailTemplate } from '../hooks/use-campaigns'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'transactional', label: 'Transactional' },
]

function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

export function TemplateGallery() {
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const { data, isLoading } = useEmailTemplates({
    category: categoryFilter || undefined,
    search: search || undefined,
  })
  const createMutation = useCreateEmailTemplate()

  const [showCreate, setShowCreate] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newShortcut, setNewShortcut] = useState('')

  const templates = data?.templates ?? []

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) {
      toast.error('Name and content are required')
      return
    }

    const variables = extractVariables(newContent).map(key => ({
      key,
      label: key,
      required: false,
    }))

    try {
      await createMutation.mutateAsync({
        name: newName,
        subject: newSubject || undefined,
        contentHtml: newContent,
        variables,
        category: newCategory,
        shortcut: newShortcut || undefined,
      })
      toast.success('Template created')
      setShowCreate(false)
      setNewName('')
      setNewSubject('')
      setNewContent('')
      setNewCategory('general')
      setNewShortcut('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create template')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="bg-zinc-950/30 border-zinc-800 text-zinc-200 pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36 bg-zinc-950/30 border-zinc-800 text-zinc-200">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="">All</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Create Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Name</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Welcome Email"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Subject</Label>
                <Input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Welcome to our platform!"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">Shortcut</Label>
                <Input
                  value={newShortcut}
                  onChange={e => setNewShortcut(e.target.value)}
                  placeholder="e.g. /welcome"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">HTML Content</Label>
              <Textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="<html>...template HTML with {{variables}}...</html>"
                className="bg-zinc-900/50 border-zinc-700 text-zinc-100 font-mono text-xs min-h-48"
              />
              {newContent && extractVariables(newContent).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-zinc-500">Variables:</span>
                  {extractVariables(newContent).map(v => (
                    <Badge key={v} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-1" />
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-zinc-950/30 border-zinc-800 animate-pulse">
              <CardContent className="p-4 h-40" />
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="bg-zinc-950/30 border-zinc-800">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-zinc-300 font-medium">No templates yet</h3>
            <p className="text-zinc-500 text-sm mt-1">Create reusable email templates for your campaigns.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
          {templates.map((template: Record<string, unknown>) => {
            const variables: { key: string }[] = JSON.parse((template.variables as string) || '[]')
            const isPreviewing = previewId === (template.id as string)

            return (
              <motion.div
                key={template.id as string}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-zinc-950/30 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    {/* Thumbnail/Preview area */}
                    <div className="bg-white/5 rounded-md h-20 mb-3 flex items-center justify-center overflow-hidden">
                      {isPreviewing ? (
                        <div
                          className="text-xs text-zinc-600 w-full h-full p-2 overflow-hidden"
                          dangerouslySetInnerHTML={{
                            __html: ((template.contentHtml as string) || '').slice(0, 500),
                          }}
                        />
                      ) : (
                        <Code className="h-8 w-8 text-zinc-700" />
                      )}
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-zinc-100 truncate">
                          {template.name as string}
                        </h3>
                        {(template.subject as string) && (
                          <p className="text-xs text-zinc-500 truncate">
                            {template.subject as string}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2 bg-zinc-800 text-zinc-400">
                        {template.category as string}
                      </Badge>
                    </div>

                    {/* Variables & Shortcut */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {variables.slice(0, 4).map(v => (
                        <span key={v.key} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                          {`{{${v.key}}}`}
                        </span>
                      ))}
                      {variables.length > 4 && (
                        <span className="text-[10px] text-zinc-500">+{variables.length - 4}</span>
                      )}
                    </div>

                    {template.shortcut && (
                      <div className="mt-2 flex items-center gap-1">
                        <kbd className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                          {template.shortcut as string}
                        </kbd>
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-zinc-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewId(isPreviewing ? null : (template.id as string))
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" /> {isPreviewing ? 'Hide' : 'Preview'}
                      </Button>
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
