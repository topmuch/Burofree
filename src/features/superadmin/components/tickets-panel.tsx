'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket,
  Loader2,
  User,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface SupportTicket {
  id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  createdBy: {
    id: string
    email: string
    name: string | null
  }
  assignedTo: {
    id: string
    email: string
    name: string | null
  } | null
  resolution: string | null
  createdAt: string
  updatedAt: string
}

interface AdminUser {
  id: string
  email: string
  name: string | null
}

/* ─── Constants ────────────────────────────────────────────────────────────── */

const PRIORITY_STYLES: Record<string, { badge: string; label: string }> = {
  low: { badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30', label: 'Basse' },
  normal: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Normale' },
  high: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Haute' },
  urgent: { badge: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Urgente' },
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  open: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Ouvert' },
  in_progress: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'En cours' },
  waiting_user: { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', label: 'Attente utilisateur' },
  resolved: { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Résolu' },
  closed: { badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30', label: 'Fermé' },
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function TicketsPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  /* Resolution form state */
  const [resolution, setResolution] = useState('')

  /* ── Fetch Tickets ───────────────────────────────────────────────────────── */

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (assigneeFilter !== 'all') params.set('assignedTo', assigneeFilter)

      const res = await fetch(`/api/superadmin/tickets?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setTickets(json.tickets ?? json ?? [])
      }
    } catch (err) {
      console.error('Erreur chargement tickets :', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, assigneeFilter])

  /* ── Fetch Admins for Assignment ─────────────────────────────────────────── */

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/admins')
      if (res.ok) {
        const json = await res.json()
        setAdmins(json.admins ?? json ?? [])
      }
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    fetchTickets()
    fetchAdmins()
  }, [fetchTickets, fetchAdmins])

  /* ── Update Ticket ───────────────────────────────────────────────────────── */

  const updateTicket = async (ticketId: string, updates: Record<string, unknown>) => {
    setActionLoading(ticketId)
    try {
      const res = await fetch(`/api/superadmin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        fetchTickets()
      }
    } catch (err) {
      console.error('Erreur mise à jour ticket :', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssign = (ticketId: string, adminId: string) => {
    updateTicket(ticketId, { assignedTo: adminId || null })
  }

  const handleStatusChange = (ticketId: string, status: string) => {
    updateTicket(ticketId, { status })
  }

  const handlePriorityChange = (ticketId: string, priority: string) => {
    updateTicket(ticketId, { priority })
  }

  const handleResolve = (ticketId: string) => {
    if (!resolution.trim()) return
    updateTicket(ticketId, { status: 'resolved', resolution })
    setResolution('')
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Ticket className="size-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-zinc-100">Tickets support</h2>
      </div>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="open">Ouvert</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="waiting_user">Attente utilisateur</SelectItem>
                <SelectItem value="resolved">Résolu</SelectItem>
                <SelectItem value="closed">Fermé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="normal">Normale</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue placeholder="Assigné à" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">Tous les assignés</SelectItem>
                <SelectItem value="unassigned">Non assigné</SelectItem>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.name || admin.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">Aucun ticket trouvé</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const isExpanded = expandedId === ticket.id
            const priorityStyle = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.normal
            const statusStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.open
            const isActing = actionLoading === ticket.id

            return (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Card className="border-zinc-800 bg-zinc-900 shadow-none">
                  <CardContent className="p-4">
                    {/* Header Row */}
                    <div
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-zinc-100">{ticket.title}</span>
                          <Badge className={priorityStyle.badge} variant="outline">
                            {priorityStyle.label}
                          </Badge>
                          <Badge className={statusStyle.badge} variant="outline">
                            {statusStyle.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500">
                            <User className="inline size-3 mr-1" />
                            {ticket.createdBy.name || ticket.createdBy.email}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {new Date(ticket.createdAt).toLocaleString('fr-FR')}
                          </span>
                          {ticket.assignedTo && (
                            <span className="text-xs text-emerald-500/80">
                              Assigné à {ticket.assignedTo.name || ticket.assignedTo.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-zinc-500" />
                        ) : (
                          <ChevronDown className="size-4 text-zinc-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 pt-4 border-t border-zinc-800 space-y-4"
                        >
                          {/* Description */}
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Description</p>
                            <p className="text-sm text-zinc-300">{ticket.description}</p>
                          </div>

                          {/* Resolution (if any) */}
                          {ticket.resolution && (
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Résolution</p>
                              <p className="text-sm text-emerald-300 bg-emerald-500/5 p-3 rounded-lg">
                                {ticket.resolution}
                              </p>
                            </div>
                          )}

                          <Separator className="bg-zinc-800" />

                          {/* Actions */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Change Status */}
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Changer le statut</label>
                              <Select
                                value={ticket.status}
                                onValueChange={(v) => handleStatusChange(ticket.id, v)}
                                disabled={isActing}
                              >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                  <SelectItem value="open">Ouvert</SelectItem>
                                  <SelectItem value="in_progress">En cours</SelectItem>
                                  <SelectItem value="waiting_user">Attente utilisateur</SelectItem>
                                  <SelectItem value="resolved">Résolu</SelectItem>
                                  <SelectItem value="closed">Fermé</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Change Priority */}
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Changer la priorité</label>
                              <Select
                                value={ticket.priority}
                                onValueChange={(v) => handlePriorityChange(ticket.id, v)}
                                disabled={isActing}
                              >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                  <SelectItem value="low">Basse</SelectItem>
                                  <SelectItem value="normal">Normale</SelectItem>
                                  <SelectItem value="high">Haute</SelectItem>
                                  <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Assign To */}
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Assigner à</label>
                              <Select
                                value={ticket.assignedTo?.id || 'unassigned'}
                                onValueChange={(v) => handleAssign(ticket.id, v === 'unassigned' ? '' : v)}
                                disabled={isActing}
                              >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                  <SelectItem value="unassigned">Non assigné</SelectItem>
                                  {admins.map((admin) => (
                                    <SelectItem key={admin.id} value={admin.id}>
                                      {admin.name || admin.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Add Resolution */}
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Ajouter une résolution</label>
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Décrivez la résolution..."
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 min-h-[60px]"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="mt-2 bg-emerald-600 text-white hover:bg-emerald-500"
                              onClick={() => handleResolve(ticket.id)}
                              disabled={!resolution.trim() || isActing}
                            >
                              {isActing ? <Loader2 className="mr-2 size-3 animate-spin" /> : <CheckCircle2 className="mr-2 size-3" />}
                              Résoudre le ticket
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
