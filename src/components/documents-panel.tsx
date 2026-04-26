'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileText, FileCheck, FileQuestion, File, Plus, Search, Copy, Trash2, FolderOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore, Document as DocType, Snippet } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const typeIcons: Record<string, React.ElementType> = {
  contract: FileCheck,
  quote: FileText,
  deliverable: File,
  feedback: FileQuestion,
  other: FileText,
}

const typeLabels: Record<string, string> = {
  contract: 'Contrat',
  quote: 'Devis',
  deliverable: 'Livrable',
  feedback: 'Retour',
  other: 'Autre',
}

const snippetCategoryLabels: Record<string, string> = {
  email_reply: 'Réponse email',
  contract_clause: 'Clause contractuelle',
  quote_structure: 'Structure devis',
  other: 'Autre',
}

function DocumentForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const { projects } = useAppStore()
  const [name, setName] = useState('')
  const [type, setType] = useState('contract')
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState('')

  const handleSubmit = () => {
    if (!name) return
    onSubmit({ name, type, content: content || null, projectId: projectId || null })
    setName(''); setType('contract'); setContent(''); setProjectId('')
  }

  return (
    <div className="space-y-4">
      <div><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du document" className="bg-secondary" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="contract">Contrat</SelectItem>
              <SelectItem value="quote">Devis</SelectItem>
              <SelectItem value="deliverable">Livrable</SelectItem>
              <SelectItem value="feedback">Retour</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Projet</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="bg-secondary"><SelectValue placeholder="Aucun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Contenu</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenu du document..." className="bg-secondary min-h-[100px]" /></div>
      <Button onClick={handleSubmit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
        <Plus className="w-4 h-4 mr-2" /> Créer le document
      </Button>
    </div>
  )
}

function SnippetForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('email_reply')

  const handleSubmit = () => {
    if (!title || !content) return
    onSubmit({ title, content, category })
    setTitle(''); setContent(''); setCategory('email_reply')
  }

  return (
    <div className="space-y-4">
      <div><Label>Titre *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du snippet" className="bg-secondary" /></div>
      <div>
        <Label>Catégorie</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="email_reply">Réponse email</SelectItem>
            <SelectItem value="contract_clause">Clause contractuelle</SelectItem>
            <SelectItem value="quote_structure">Structure devis</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Contenu *</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenu du snippet..." className="bg-secondary min-h-[120px]" /></div>
      <Button onClick={handleSubmit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
        <Plus className="w-4 h-4 mr-2" /> Créer le snippet
      </Button>
    </div>
  )
}

export function DocumentsPanel() {
  const { documents, snippets, createDocument, deleteDocument, createSnippet, deleteSnippet, projects } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [activeTab, setActiveTab] = useState('documents')

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.content || '').toLowerCase().includes(search.toLowerCase())
      const matchProject = filterProject === 'all' || d.projectId === filterProject
      return matchSearch && matchProject
    })
  }, [documents, search, filterProject])

  const filteredSnippets = useMemo(() => {
    return snippets.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase()))
  }, [snippets, search])

  const copySnippet = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Snippet copié dans le presse-papiers')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Documents & Snippets</h2>
          <p className="text-sm text-muted-foreground">{documents.length} document(s) · {snippets.length} snippet(s)</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 bg-secondary" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-secondary">
            <TabsTrigger value="documents">
              <FolderOpen className="w-4 h-4 mr-1" /> Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="snippets">
              <FileText className="w-4 h-4 mr-1" /> Snippets ({snippets.length})
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'documents' ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nouveau document</DialogTitle></DialogHeader>
                <DocumentForm onSubmit={(data) => createDocument(data as Partial<DocType>)} />
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Snippet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nouveau snippet</DialogTitle></DialogHeader>
                <SnippetForm onSubmit={(data) => createSnippet(data as Partial<Snippet>)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="documents" className="mt-4">
          {/* Project Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <Button variant={filterProject === 'all' ? 'default' : 'outline'} size="sm" className={cn('text-xs', filterProject === 'all' && 'bg-emerald-500/20 text-emerald-400')} onClick={() => setFilterProject('all')}>
              Tous
            </Button>
            {projects.map(p => (
              <Button key={p.id} variant={filterProject === p.id ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setFilterProject(p.id)}>
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: p.color }} />
                {p.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDocs.map(doc => {
              const Icon = typeIcons[doc.type] || FileText
              return (
                <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-lg bg-card border border-border hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <Badge className="text-[10px] h-4 mt-0.5 bg-secondary">{typeLabels[doc.type] || doc.type}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteDocument(doc.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {doc.content && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{doc.content}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {doc.project && (
                      <Badge variant="outline" className="text-[10px] h-4">{doc.project.name}</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </motion.div>
              )
            })}
            {filteredDocs.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">Aucun document trouvé</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="snippets" className="mt-4">
          <div className="space-y-3">
            {filteredSnippets.map(snippet => (
              <motion.div key={snippet.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-lg bg-card border border-border hover:border-emerald-500/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{snippet.title}</p>
                    <Badge className="text-[10px] h-4 mt-1 bg-secondary">{snippetCategoryLabels[snippet.category] || snippet.category}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copySnippet(snippet.content)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteSnippet(snippet.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-4 font-mono bg-secondary/50 p-2 rounded">{snippet.content}</p>
              </motion.div>
            ))}
            {filteredSnippets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Aucun snippet trouvé</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
