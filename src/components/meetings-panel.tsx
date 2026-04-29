'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Phone, MapPin, Link, Calendar, Plus, Eye, Trash2,
  CheckCircle2, Clock, X, ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { useAppStore, type Meeting } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Config ────────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  scheduled: { label: 'Planifiée', className: 'bg-amber-500/20 text-amber-400', icon: Clock },
  completed: { label: 'Terminée', className: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', className: 'bg-zinc-500/20 text-zinc-400', icon: X },
}

const typeConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  video: { label: 'Vidéo', className: 'border-blue-500/30 text-blue-400', icon: Video },
  phone: { label: 'Téléphone', className: 'border-emerald-500/30 text-emerald-400', icon: Phone },
  in_person: { label: 'Présentiel', className: 'border-amber-500/30 text-amber-400', icon: MapPin },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(dateStr: string) {
  return `${formatDate(dateStr)} à ${formatTime(dateStr)}`
}

function formatDuration(start: string, end?: string | null) {
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}` : `${h}h`
}

// ─── Create / Edit Meeting Dialog ──────────────────────────────────────────────

function CreateMeetingDialog({
  open,
  onOpenChange,
  editMeeting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editMeeting?: Meeting | null
}) {
  const { projects, createMeeting, updateMeeting } = useAppStore()
  const isEditing = !!editMeeting

  const [title, setTitle] = useState(editMeeting?.title ?? '')
  const [description, setDescription] = useState(editMeeting?.description ?? '')
  const [startDate, setStartDate] = useState(
    editMeeting?.startDate ? new Date(editMeeting.startDate).toISOString().slice(0, 16) : ''
  )
  const [endDate, setEndDate] = useState(
    editMeeting?.endDate ? new Date(editMeeting.endDate).toISOString().slice(0, 16) : ''
  )
  const [location, setLocation] = useState(editMeeting?.location ?? '')
  const [meetingUrl, setMeetingUrl] = useState(editMeeting?.meetingUrl ?? '')
  const [type, setType] = useState<string>(editMeeting?.type ?? 'video')
  const [status, setStatus] = useState<string>(editMeeting?.status ?? 'scheduled')
  const [agenda, setAgenda] = useState(editMeeting?.agenda ?? '')
  const [notes, setNotes] = useState(editMeeting?.notes ?? '')
  const [projectId, setProjectId] = useState(editMeeting?.projectId ?? '')
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens with new data
  const resetForm = () => {
    setTitle(editMeeting?.title ?? '')
    setDescription(editMeeting?.description ?? '')
    setStartDate(editMeeting?.startDate ? new Date(editMeeting.startDate).toISOString().slice(0, 16) : '')
    setEndDate(editMeeting?.endDate ? new Date(editMeeting.endDate).toISOString().slice(0, 16) : '')
    setLocation(editMeeting?.location ?? '')
    setMeetingUrl(editMeeting?.meetingUrl ?? '')
    setType(editMeeting?.type ?? 'video')
    setStatus(editMeeting?.status ?? 'scheduled')
    setAgenda(editMeeting?.agenda ?? '')
    setNotes(editMeeting?.notes ?? '')
    setProjectId(editMeeting?.projectId ?? '')
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    if (!startDate) {
      toast.error('La date de début est requise')
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Meeting> = {
        title: title.trim(),
        description: description.trim() || null,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        location: location.trim() || null,
        meetingUrl: meetingUrl.trim() || null,
        type,
        status,
        agenda: agenda.trim() || null,
        notes: notes.trim() || null,
        projectId: projectId || null,
      }

      if (isEditing && editMeeting) {
        await updateMeeting(editMeeting.id, payload)
        toast.success('Réunion mise à jour')
      } else {
        await createMeeting(payload)
        toast.success('Réunion créée')
      }
      onOpenChange(false)
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            {isEditing ? 'Modifier la réunion' : 'Nouvelle réunion'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Point hebdomadaire client"
              className="bg-secondary"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Résumé de la réunion..."
              className="bg-secondary min-h-[70px]"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début *</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-secondary"
              />
            </div>
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Visioconférence</SelectItem>
                  <SelectItem value="phone">Téléphone</SelectItem>
                  <SelectItem value="in_person">Présentiel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Planifiée</SelectItem>
                  <SelectItem value="completed">Terminée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location & URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lieu</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex : Café de la gare"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Lien de la réunion</Label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="bg-secondary"
              />
            </div>
          </div>

          {/* Agenda */}
          <div className="space-y-2">
            <Label>Ordre du jour</Label>
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Revue du sprint&#10;2. Points bloquants&#10;3. Prochaines étapes"
              className="bg-secondary min-h-[90px]"
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>Projet associé</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Aucun projet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun projet</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes..."
              className="bg-secondary min-h-[70px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {saving
              ? 'Sauvegarde...'
              : isEditing
                ? 'Enregistrer'
                : 'Créer la réunion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View Meeting Dialog ───────────────────────────────────────────────────────

function ViewMeetingDialog({
  meeting,
  open,
  onOpenChange,
  onEdit,
}: {
  meeting: Meeting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (meeting: Meeting) => void
}) {
  const { updateMeeting, deleteMeeting } = useAppStore()

  if (!meeting) return null

  const tConfig = typeConfig[meeting.type] || typeConfig.video
  const sConfig = statusConfig[meeting.status] || statusConfig.scheduled
  const duration = formatDuration(meeting.startDate, meeting.endDate)

  const handleMarkCompleted = async () => {
    await updateMeeting(meeting.id, { status: 'completed' })
    toast.success('Réunion marquée comme terminée')
    onOpenChange(false)
  }

  const handleDelete = async () => {
    await deleteMeeting(meeting.id)
    toast.success('Réunion supprimée')
    onOpenChange(false)
  }

  const handleCancel = async () => {
    await updateMeeting(meeting.id, { status: 'cancelled' })
    toast.success('Réunion annulée')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            {meeting.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-xs gap-1', tConfig.className)}>
              <tConfig.icon className="w-3 h-3" />
              {tConfig.label}
            </Badge>
            <Badge className={cn('text-xs', sConfig.className)}>
              {sConfig.label}
            </Badge>
            {meeting.project && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: meeting.project.color,
                  color: meeting.project.color,
                }}
              >
                {meeting.project.name}
              </Badge>
            )}
          </div>

          {/* Date & Time */}
          <div className="bg-secondary/50 p-3 rounded-lg space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{formatDateTime(meeting.startDate)}</span>
            </div>
            {meeting.endDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Fin : {formatDateTime(meeting.endDate)}
                  {duration && (
                    <span className="ml-2 text-emerald-400 font-medium">({duration})</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Location / URL */}
          {(meeting.location || meeting.meetingUrl) && (
            <div className="space-y-2">
              {meeting.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{meeting.location}</span>
                </div>
              )}
              {meeting.meetingUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Link className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <a
                    href={meeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                  >
                    {meeting.meetingUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {meeting.description && (
            <div className="bg-secondary/50 p-3 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="whitespace-pre-wrap">{meeting.description}</p>
            </div>
          )}

          {/* Agenda */}
          {meeting.agenda && (
            <div className="bg-secondary/50 p-3 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Ordre du jour</p>
              <p className="whitespace-pre-wrap">{meeting.agenda}</p>
            </div>
          )}

          {/* Notes */}
          {meeting.notes && (
            <div className="bg-secondary/50 p-3 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="whitespace-pre-wrap">{meeting.notes}</p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            {meeting.status === 'scheduled' && (
              <>
                <Button
                  onClick={handleMarkCompleted}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Marquer comme terminée
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4 mr-2" /> Annuler la réunion
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => { onOpenChange(false); onEdit(meeting) }}
            >
              Modifier
            </Button>
            <Button
              variant="ghost"
              className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Meeting Card ──────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  onView,
  onEdit,
}: {
  meeting: Meeting
  onView: (m: Meeting) => void
  onEdit: (m: Meeting) => void
}) {
  const { updateMeeting, deleteMeeting } = useAppStore()

  const tConfig = typeConfig[meeting.type] || typeConfig.video
  const sConfig = statusConfig[meeting.status] || statusConfig.scheduled
  const duration = formatDuration(meeting.startDate, meeting.endDate)

  const handleMarkCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await updateMeeting(meeting.id, { status: 'completed' })
    toast.success('Réunion terminée')
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteMeeting(meeting.id)
    toast.success('Réunion supprimée')
  }

  const isUpcoming = meeting.status === 'scheduled' && new Date(meeting.startDate) > new Date()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all hover:border-emerald-500/30',
          meeting.status === 'cancelled' && 'opacity-60',
          meeting.status === 'completed' && 'opacity-75'
        )}
        onClick={() => onView(meeting)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left section */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm truncate">{meeting.title}</h3>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 gap-1', tConfig.className)}>
                  <tConfig.icon className="w-3 h-3" />
                  {tConfig.label}
                </Badge>
                <Badge className={cn('text-[10px] px-1.5 py-0', sConfig.className)}>
                  {sConfig.label}
                </Badge>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatDateTime(meeting.startDate)}</span>
                {duration && (
                  <span className="text-emerald-400 ml-1">({duration})</span>
                )}
              </div>

              {/* Location / URL */}
              {meeting.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="truncate">{meeting.location}</span>
                </div>
              )}
              {!meeting.location && meeting.meetingUrl && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <a
                    href={meeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Lien de la réunion
                    <ExternalLink className="w-3 h-3 inline ml-0.5" />
                  </a>
                </div>
              )}

              {/* Project badge */}
              {meeting.project && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{
                    borderColor: meeting.project.color,
                    color: meeting.project.color,
                  }}
                >
                  {meeting.project.name}
                </Badge>
              )}
            </div>

            {/* Right section – quick actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {meeting.status === 'scheduled' && isUpcoming && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={handleMarkCompleted}
                  title="Marquer comme terminée"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onView(meeting) }}
                title="Voir les détails"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleDelete}
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Upcoming Meetings Widget ─────────────────────────────────────────────────

function UpcomingMeetings({ meetings, onView }: { meetings: Meeting[]; onView: (m: Meeting) => void }) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Calendar className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm">Aucune réunion à venir</p>
        <p className="text-xs mt-1">Planifiez votre première réunion</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => {
        const tConfig = typeConfig[meeting.type] || typeConfig.video
        const now = new Date()
        const start = new Date(meeting.startDate)
        const diffMs = start.getTime() - now.getTime()
        const diffHours = Math.round(diffMs / 3600000)
        const diffDays = Math.round(diffMs / 86400000)

        let relativeLabel = ''
        if (diffMs < 0) {
          relativeLabel = 'En cours'
        } else if (diffHours < 1) {
          relativeLabel = 'Dans moins d\'une heure'
        } else if (diffHours < 24) {
          relativeLabel = `Dans ${diffHours}h`
        } else if (diffDays === 1) {
          relativeLabel = 'Demain'
        } else if (diffDays < 7) {
          relativeLabel = `Dans ${diffDays} jours`
        } else {
          relativeLabel = formatDate(meeting.startDate)
        }

        return (
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 cursor-pointer transition-colors"
            onClick={() => onView(meeting)}
          >
            <div className={cn('p-2 rounded-lg', tConfig.className === typeConfig.video.className ? 'bg-blue-500/10' : tConfig.className === typeConfig.phone.className ? 'bg-emerald-500/10' : 'bg-amber-500/10')}>
              <tConfig.icon className={cn('w-4 h-4', tConfig.className.includes('blue') ? 'text-blue-400' : tConfig.className.includes('emerald') ? 'text-emerald-400' : 'text-amber-400')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{meeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(meeting.startDate)}
                {meeting.location && ` · ${meeting.location}`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={cn(
                'text-xs font-medium',
                diffMs < 3600000 && diffMs > 0 ? 'text-red-400' : diffMs < 86400000 ? 'text-amber-400' : 'text-muted-foreground'
              )}>
                {relativeLabel}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export function MeetingsPanel() {
  const { meetings, projects } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [viewMeeting, setViewMeeting] = useState<Meeting | null>(null)

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => statusFilter === 'all' || m.status === statusFilter)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [meetings, statusFilter])

  // Upcoming meetings (scheduled & in the future)
  const upcomingMeetings = useMemo(() => {
    const now = new Date()
    return meetings
      .filter((m) => m.status === 'scheduled' && new Date(m.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5)
  }, [meetings])

  // Stats
  const scheduledCount = meetings.filter((m) => m.status === 'scheduled').length
  const completedCount = meetings.filter((m) => m.status === 'completed').length
  const todayCount = meetings.filter((m) => {
    const d = new Date(m.startDate)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  const handleEdit = (meeting: Meeting) => {
    setEditMeeting(meeting)
    setEditOpen(true)
  }

  const statCards = [
    {
      title: 'Planifiées',
      value: String(scheduledCount),
      icon: Clock,
      accent: 'text-amber-400',
      bgAccent: 'bg-amber-500/10',
      borderAccent: 'border-amber-500/20',
    },
    {
      title: 'Terminées',
      value: String(completedCount),
      icon: CheckCircle2,
      accent: 'text-emerald-400',
      bgAccent: 'bg-emerald-500/10',
      borderAccent: 'border-emerald-500/20',
    },
    {
      title: "Aujourd'hui",
      value: String(todayCount),
      icon: Calendar,
      accent: 'text-blue-400',
      bgAccent: 'bg-blue-500/10',
      borderAccent: 'border-blue-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={cn('border', stat.borderAccent)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', stat.bgAccent)}>
                    <stat.icon className={cn('w-4 h-4', stat.accent)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className={cn('text-lg font-bold', stat.accent)}>{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Prochaines réunions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingMeetings meetings={upcomingMeetings} onView={setViewMeeting} />
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'scheduled', label: 'Planifiées' },
            { value: 'completed', label: 'Terminées' },
            { value: 'cancelled', label: 'Annulées' },
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'text-xs',
                statusFilter === filter.value
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Nouvelle réunion
        </Button>
      </div>

      {/* Meetings List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Calendar className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">Aucune réunion trouvée</p>
                  <p className="text-xs mt-1">Créez votre première réunion</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onView={setViewMeeting}
                onEdit={handleEdit}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Create Meeting Dialog */}
      <CreateMeetingDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit Meeting Dialog */}
      <CreateMeetingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editMeeting={editMeeting}
      />

      {/* View Meeting Dialog */}
      <ViewMeetingDialog
        meeting={viewMeeting}
        open={!!viewMeeting}
        onOpenChange={(open) => { if (!open) setViewMeeting(null) }}
        onEdit={handleEdit}
      />
    </div>
  )
}
