'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare, FileText, Clock, MessageSquare, ThumbsUp, RotateCcw,
  Send, Loader2, FolderOpen, Check, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalProject {
  id: string
  name: string
  description: string | null
  clientName: string | null
  color: string
  status: string
  deadline: string | null
  createdAt: string
}

interface PortalTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  completedAt: string | null
  category: string | null
  estimatedTime: number | null
  actualTime: number | null
  createdAt: string
}

interface PortalDocument {
  id: string
  name: string
  type: string
  mimeType: string | null
  size: number | null
  fileUrl: string | null
  createdAt: string
}

interface PortalComment {
  id: string
  entityType: string
  entityId: string
  action: string
  content: string | null
  authorName: string
  authorEmail: string
  createdAt: string
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const taskStatusLabels: Record<string, { label: string; color: string }> = {
  todo: { label: 'À faire', color: 'bg-zinc-500/20 text-zinc-400' },
  in_progress: { label: 'En cours', color: 'bg-amber-500/20 text-amber-400' },
  done: { label: 'Terminé', color: 'bg-emerald-500/20 text-emerald-400' },
  waiting_client: { label: 'Attente client', color: 'bg-blue-500/20 text-blue-400' },
  review: { label: 'En revue', color: 'bg-purple-500/20 text-purple-400' },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400' },
  high: { label: 'Haute', color: 'bg-orange-500/20 text-orange-400' },
  medium: { label: 'Moyenne', color: 'bg-amber-500/20 text-amber-400' },
  low: { label: 'Basse', color: 'bg-zinc-500/20 text-zinc-400' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PortalViewerProps {
  projectId: string
  token: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PortalViewer({ projectId, token }: PortalViewerProps) {
  const [project, setProject] = useState<PortalProject | null>(null)
  const [tasks, setTasks] = useState<PortalTask[]>([])
  const [documents, setDocuments] = useState<PortalDocument[]>([])
  const [comments, setComments] = useState<PortalComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'documents' | 'milestones'>('tasks')
  const [commentText, setCommentText] = useState('')
  const [commentAction, setCommentAction] = useState<'comment' | 'approve' | 'request_revision'>('comment')
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string; name: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Fetch portal data
  const fetchPortalData = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${projectId}/${token}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data.project)
        setTasks(data.tasks || [])
        setDocuments(data.documents || [])
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur de chargement')
      }
    } catch {
      setError('Erreur de connexion au portail')
    } finally {
      setLoading(false)
    }
  }, [projectId, token])

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${projectId}/${token}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
      }
    } catch {
      // silent
    }
  }, [projectId, token])

  useEffect(() => {
    fetchPortalData()
    fetchComments()
  }, [fetchPortalData, fetchComments])

  // Submit comment
  const handleSubmitComment = async () => {
    if (!selectedEntity) return
    if (commentAction === 'comment' && !commentText.trim()) {
      toast.error('Veuillez écrire un commentaire')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/${projectId}/${token}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedEntity.type,
          entityId: selectedEntity.id,
          action: commentAction,
          content: commentText || undefined,
          authorName: project?.clientName || 'Client',
          authorEmail: '',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message)
        setCommentText('')
        setSelectedEntity(null)
        await fetchComments()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold text-zinc-800">Accès refusé</h2>
          <p className="text-zinc-500">{error || 'Ce lien est invalide ou a expiré'}</p>
        </div>
      </div>
    )
  }

  // Milestones (tasks with due dates)
  const milestones = tasks
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

  // Task counts
  const taskCounts = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${project.color}20` }}
            >
              <span className="text-lg font-bold" style={{ color: project.color }}>P</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-500">
                Suivi de projet • {project.clientName || 'Client'}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${taskCounts.total > 0 ? (taskCounts.done / taskCounts.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {taskCounts.done}/{taskCounts.total} tâches
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Tab navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'tasks', label: 'Tâches', icon: CheckSquare },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'milestones', label: 'Jalons', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune tâche pour le moment</p>
                </div>
              ) : (
                tasks.map(task => {
                  const statusInfo = taskStatusLabels[task.status] || { label: task.status, color: 'bg-zinc-500/20 text-zinc-400' }
                  const priorityInfo = priorityLabels[task.priority] || priorityLabels.medium

                  return (
                    <Card key={task.id} className="bg-white border-gray-200 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-900 text-sm">
                                {task.status === 'done' ? (
                                  <span className="line-through text-gray-400">{task.title}</span>
                                ) : (
                                  task.title
                                )}
                              </h3>
                              <Badge className={`${statusInfo.color} text-xs border-0`}>
                                {statusInfo.label}
                              </Badge>
                              <Badge className={`${priorityInfo.color} text-xs border-0`}>
                                {priorityInfo.label}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                            )}
                            {task.dueDate && (
                              <p className="text-xs text-gray-400 mt-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Échéance : {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedEntity({ type: 'task', id: task.id, name: task.title })
                                setCommentAction('approve')
                              }}
                              title="Approuver"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-amber-600 hover:bg-amber-50"
                              onClick={() => {
                                setSelectedEntity({ type: 'task', id: task.id, name: task.title })
                                setCommentAction('request_revision')
                              }}
                              title="Demander révision"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-gray-500 hover:bg-gray-100"
                              onClick={() => {
                                setSelectedEntity({ type: 'task', id: task.id, name: task.title })
                                setCommentAction('comment')
                              }}
                              title="Commenter"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {documents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun document disponible</p>
                </div>
              ) : (
                documents.map(doc => (
                  <Card key={doc.id} className="bg-white border-gray-200 hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                          <p className="text-xs text-gray-400">
                            {doc.type} • {doc.size ? `${(doc.size / 1024).toFixed(0)} Ko` : 'Taille inconnue'}
                            {' • '}{new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      {doc.fileUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          asChild
                        >
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            Télécharger
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'milestones' && (
            <motion.div
              key="milestones"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {milestones.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun jalon défini</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                  {milestones.map((ms, index) => {
                    const isCompleted = ms.status === 'done'
                    const isOverdue = ms.dueDate && new Date(ms.dueDate) < new Date() && !isCompleted

                    return (
                      <div key={ms.id} className="relative flex items-start gap-4 pb-6">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                          isCompleted ? 'bg-emerald-100' : isOverdue ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Clock className={`w-5 h-5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={`font-medium text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {ms.title}
                          </p>
                          <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                            {new Date(ms.dueDate!).toLocaleDateString('fr-FR')}
                            {isOverdue && ' • En retard'}
                          </p>
                        </div>
                        {index === 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Prochain</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments section */}
        {comments.length > 0 && (
          <>
            <Separator className="bg-gray-200" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Commentaires récents</h3>
              <div className="space-y-3">
                {comments.map(comment => {
                  const actionLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
                    comment: { label: 'Commentaire', icon: MessageSquare, color: 'text-gray-500' },
                    approve: { label: 'Approuvé', icon: ThumbsUp, color: 'text-emerald-500' },
                    request_revision: { label: 'Révision demandée', icon: RotateCcw, color: 'text-amber-500' },
                  }
                  const actionInfo = actionLabels[comment.action] || actionLabels.comment
                  const ActionIcon = actionInfo.icon

                  return (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{comment.authorName}</span>
                        <span className={`text-xs ${actionInfo.color} flex items-center gap-1`}>
                          <ActionIcon className="w-3 h-3" />
                          {actionInfo.label}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(comment.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {comment.content && (
                        <p className="text-sm text-gray-600">{comment.content}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Comment dialog (inline) */}
        <AnimatePresence>
          {selectedEntity && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {commentAction === 'comment' && 'Commenter'}
                    {commentAction === 'approve' && 'Approuver'}
                    {commentAction === 'request_revision' && 'Demander une révision'}
                  </p>
                  <p className="text-xs text-gray-500">« {selectedEntity.name} »</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-gray-400"
                  onClick={() => setSelectedEntity(null)}
                >
                  ✕
                </Button>
              </div>

              <Textarea
                placeholder={
                  commentAction === 'comment' ? 'Votre commentaire...' :
                  commentAction === 'approve' ? 'Message (optionnel)...' :
                  'Décrivez les modifications souhaitées...'
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="mb-3 min-h-[80px] border-gray-200 focus:border-emerald-400"
              />

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSubmitComment}
                  disabled={submitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  size="sm"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  {commentAction === 'comment' && 'Envoyer'}
                  {commentAction === 'approve' && 'Approuver'}
                  {commentAction === 'request_revision' && 'Demander révision'}
                </Button>

                <div className="flex gap-1">
                  {(['comment', 'approve', 'request_revision'] as const).map(action => {
                    const labels = { comment: 'Commenter', approve: 'Approuver', request_revision: 'Révision' }
                    const icons = { comment: MessageSquare, approve: ThumbsUp, request_revision: RotateCcw }
                    const Icon = icons[action]
                    return (
                      <Button
                        key={action}
                        variant={commentAction === action ? 'default' : 'ghost'}
                        size="sm"
                        className={commentAction === action ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}
                        onClick={() => setCommentAction(action)}
                      >
                        <Icon className="w-3.5 h-3.5 mr-1" />
                        {labels[action]}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
