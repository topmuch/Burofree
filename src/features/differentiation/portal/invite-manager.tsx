'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Copy, Trash2, Plus, Clock, ExternalLink, Eye,
  Loader2, Mail, User, Calendar, Check, X as XIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalInvite {
  id: string
  projectId: string
  token: string
  email: string
  clientName: string | null
  expiresAt: string
  accessedAt: string | null
  accessCount: number
  isActive: boolean
  createdAt: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InviteManager() {
  const { projects } = useAppStore()
  const [invites, setInvites] = useState<PortalInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Form state
  const [formProjectId, setFormProjectId] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formClientName, setFormClientName] = useState('')
  const [formExpiresDays, setFormExpiresDays] = useState('30')
  const [creating, setCreating] = useState(false)

  // Fetch invites (we'll get them by fetching each project's invites)
  const fetchInvites = useCallback(async () => {
    try {
      // Since we need invites for all projects, fetch them from a dedicated endpoint
      // For now, we'll build the list from projects + their portal invites
      const userProjects = projects
      const allInvites: PortalInvite[] = []

      for (const project of userProjects) {
        try {
          // Try to get invites from the project
          const res = await fetch(`/api/portal/invites?projectId=${project.id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.invites) {
              allInvites.push(...data.invites)
            }
          }
        } catch {
          // Skip failed project fetches
        }
      }

      setInvites(allInvites)
    } catch (error) {
      console.error('Error fetching invites:', error)
    } finally {
      setLoading(false)
    }
  }, [projects])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  // Create invite
  const handleCreateInvite = async () => {
    if (!formProjectId || !formEmail || !formClientName) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formProjectId,
          clientEmail: formEmail,
          clientName: formClientName,
          expiresInDays: parseInt(formExpiresDays, 10),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || 'Invitation créée avec succès')
        setCreateDialogOpen(false)
        setFormEmail('')
        setFormClientName('')
        setFormExpiresDays('30')
        await fetchInvites()
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setCreating(false)
    }
  }

  // Copy link
  const handleCopyLink = (token: string, projectId: string) => {
    const url = `${window.location.origin}/portal/${projectId}/${token}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Lien copié dans le presse-papier')
    }).catch(() => {
      toast.error('Impossible de copier le lien')
    })
  }

  // Revoke invite
  const handleRevoke = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/portal/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Invitation révoquée')
        await fetchInvites()
      } else {
        toast.error('Erreur lors de la révocation')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  // Check if invite is expired
  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date()

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Portail Client</h2>
          <p className="text-sm text-zinc-400 mt-1">Gérez les accès de vos clients à leurs projets</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30">
              <Plus className="w-4 h-4 mr-1" />
              Nouvelle invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Créer une invitation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Projet *</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.clientName || 'Sans client'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Nom du client *
                </Label>
                <Input
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                  placeholder="Prénom Nom"
                  className="bg-zinc-800 border-zinc-700 text-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />
                  Email du client *
                </Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="bg-zinc-800 border-zinc-700 text-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Durée de validité
                </Label>
                <Select value={formExpiresDays} onValueChange={setFormExpiresDays}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="14">14 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="60">60 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateInvite}
                disabled={creating}
                className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Globe className="w-4 h-4 mr-1" />
                )}
                Créer l&apos;invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invites list */}
      {invites.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune invitation active</p>
          <p className="text-xs mt-1">Créez une invitation pour permettre à vos clients de suivre leurs projets</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {invites.map(invite => {
              const expired = isExpired(invite.expiresAt)
              const project = projects.find(p => p.id === invite.projectId)

              return (
                <motion.div
                  key={invite.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-zinc-100 text-sm">
                              {invite.clientName || invite.email}
                            </h3>
                            {invite.isActive && !expired ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Actif</Badge>
                            ) : expired ? (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Expiré</Badge>
                            ) : (
                              <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs">Inactif</Badge>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            <Mail className="w-3 h-3 inline mr-1" />
                            {invite.email}
                          </p>
                          {project && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Projet : {project.name}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                            <span>
                              <Clock className="w-3 h-3 inline mr-1" />
                              Expire le {new Date(invite.expiresAt).toLocaleDateString('fr-FR')}
                            </span>
                            {invite.accessCount > 0 && (
                              <span>
                                <Eye className="w-3 h-3 inline mr-1" />
                                {invite.accessCount} visite{invite.accessCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => handleCopyLink(invite.token, invite.projectId)}
                            title="Copier le lien"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                            onClick={() => window.open(`/portal/${invite.projectId}/${invite.token}`, '_blank')}
                            title="Ouvrir le portail"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          {invite.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => handleRevoke(invite.id)}
                              title="Révoquer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
