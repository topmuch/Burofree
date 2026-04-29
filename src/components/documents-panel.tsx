'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, FileSpreadsheet, Image, File, Plus, Search, Copy, Trash2,
  FolderOpen, Upload, Eye, X, Folder
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore, type Document as DocType, type Snippet } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const typeIcons: Record<string, React.ElementType> = {
  contract: FileText,
  quote: FileSpreadsheet,
  deliverable: File,
  feedback: Image,
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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function DocumentForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const { projects } = useAppStore()
  const [name, setName] = useState('')
  const [type, setType] = useState('contract')
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    onSubmit({ name, type, content: content || null, projectId: projectId === 'none' ? null : projectId || null })
    setName(''); setType('contract'); setContent(''); setProjectId('')
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Nom *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du document" className="bg-secondary" />
      </div>
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
      <div>
        <Label>Contenu</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenu du document..." className="bg-secondary min-h-[100px]" />
      </div>
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
    if (!title.trim() || !content.trim()) {
      toast.error('Titre et contenu requis')
      return
    }
    onSubmit({ title, content, category })
    setTitle(''); setContent(''); setCategory('email_reply')
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du modèle" className="bg-secondary" />
      </div>
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
      <div>
        <Label>Contenu *</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenu du modèle..." className="bg-secondary min-h-[120px]" />
      </div>
      <Button onClick={handleSubmit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
        <Plus className="w-4 h-4 mr-2" /> Créer le modèle
      </Button>
    </div>
  )
}

export function DocumentsPanel() {
  const { documents, snippets, projects, createDocument, deleteDocument, createSnippet, deleteSnippet } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [activeTab, setActiveTab] = useState('documents')
  const [addDocOpen, setAddDocOpen] = useState(false)
  const [addSnippetOpen, setAddSnippetOpen] = useState(false)
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null)

  const projectDocCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    documents.forEach(d => {
      if (d.projectId) {
        counts[d.projectId] = (counts[d.projectId] || 0) + 1
      }
    })
    return counts
  }, [documents])

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.content || '').toLowerCase().includes(search.toLowerCase())
      const matchProject = filterProject === 'all' || d.projectId === filterProject
      const matchType = filterType === 'all' || d.type === filterType
      return matchSearch && matchProject && matchType
    })
  }, [documents, search, filterProject, filterType])

  const filteredSnippets = useMemo(() => {
    return snippets.filter(s =>
      !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase())
    )
  }, [snippets, search])

  const copySnippet = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Copié !')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
            Documents & Modèles
          </h2>
          <p className="text-sm text-muted-foreground">{documents.length} document(s) · {snippets.length} modèle(s)</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-secondary">
            <TabsTrigger value="documents">
              <FolderOpen className="w-4 h-4 mr-1" /> Documents
            </TabsTrigger>
            <TabsTrigger value="snippets">
              <FileText className="w-4 h-4 mr-1" /> Modèles
            </TabsTrigger>
          </TabsList>

          {activeTab === 'documents' ? (
            <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nouveau document</DialogTitle></DialogHeader>
                <DocumentForm onSubmit={(data) => { createDocument(data as Partial<DocType>); setAddDocOpen(false) }} />
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={addSnippetOpen} onOpenChange={setAddSnippetOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Modèle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nouveau modèle</DialogTitle></DialogHeader>
                <SnippetForm onSubmit={(data) => { createSnippet(data as Partial<Snippet>); setAddSnippetOpen(false) }} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="documents" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Column: Project List */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <button
                      onClick={() => setFilterProject('all')}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors',
                        filterProject === 'all' ? 'bg-emerald-500/15 text-emerald-400' : 'hover:bg-secondary'
                      )}
                    >
                      <Folder className="w-4 h-4" />
                      <span className="font-medium">Tous les documents</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-4">{documents.length}</Badge>
                    </button>
                    {projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setFilterProject(p.id)}
                        className={cn(
                          'w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors',
                          filterProject === p.id ? 'bg-emerald-500/15 text-emerald-400' : 'hover:bg-secondary'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          {p.clientName && <p className="text-xs text-muted-foreground truncate">{p.clientName}</p>}
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-4">
                          {projectDocCounts[p.id] || 0}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Document Grid */}
            <div className="lg:col-span-3 space-y-3">
              {/* Search & Type Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 bg-secondary" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px] bg-secondary">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="contract">Contrat</SelectItem>
                    <SelectItem value="quote">Devis</SelectItem>
                    <SelectItem value="deliverable">Livrable</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Document Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <AnimatePresence>
                  {filteredDocs.map(doc => {
                    const Icon = typeIcons[doc.type] || FileText
                    const isHovered = hoveredDoc === doc.id
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative p-4 rounded-lg bg-card border border-border hover:border-emerald-500/30 transition-colors group"
                        onMouseEnter={() => setHoveredDoc(doc.id)}
                        onMouseLeave={() => setHoveredDoc(null)}
                      >
                        {/* Hover Action Buttons */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute top-2 right-2 flex items-center gap-1 z-10"
                            >
                              <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur-sm">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 backdrop-blur-sm text-red-400 hover:text-red-300"
                                onClick={() => deleteDocument(doc.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
                            <Icon className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <Badge className="text-[10px] h-4 mt-1 bg-secondary">{typeLabels[doc.type] || doc.type}</Badge>
                          </div>
                        </div>

                        {doc.content && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.content}</p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          {doc.project && (
                            <Badge variant="outline" className="text-[10px] h-4" style={{ borderColor: doc.project.color, color: doc.project.color }}>
                              {doc.project.name}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatFileSize(doc.size)}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {filteredDocs.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucun document trouvé</p>
                  </div>
                )}
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-emerald-500/40 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Glisser-déposer ou cliquer</p>
                <p className="text-xs text-muted-foreground mt-1">pour ajouter des fichiers</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="snippets" className="mt-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un modèle..." className="pl-9 bg-secondary" />
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {filteredSnippets.map(snippet => (
                <motion.div
                  key={snippet.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-4 rounded-lg bg-card border border-border hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{snippet.title}</p>
                      <Badge className="text-[10px] h-4 mt-1 bg-secondary">
                        {snippetCategoryLabels[snippet.category] || snippet.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                        onClick={() => copySnippet(snippet.content)}
                        title="Copier"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => deleteSnippet(snippet.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-4 font-mono bg-secondary/50 p-2 rounded">
                    {snippet.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredSnippets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun modèle trouvé</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
