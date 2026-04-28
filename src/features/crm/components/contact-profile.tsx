'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, Building2, Edit2, Pin,
  MessageSquare, Briefcase, Clock, Plus, Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useContact, useUpdateContact, useAddNote, useContactNotes } from '../hooks/use-crm'

// ─── Types ──────────────────────────────────────────────────────────────────

const lifecycleColors: Record<string, string> = {
  lead: 'bg-zinc-500/20 text-zinc-300',
  qualified: 'bg-blue-500/20 text-blue-300',
  opportunity: 'bg-amber-500/20 text-amber-300',
  customer: 'bg-emerald-500/20 text-emerald-300',
  churned: 'bg-red-500/20 text-red-300',
}

const lifecycleLabels: Record<string, string> = {
  lead: 'Prospect',
  qualified: 'Qualifié',
  opportunity: 'Opportunité',
  customer: 'Client',
  churned: 'Perdu',
}

const activityIcons: Record<string, React.ElementType> = {
  email_sent: Mail,
  email_opened: Mail,
  call_made: Phone,
  note_added: MessageSquare,
  deal_created: Briefcase,
  campaign_sent: Mail,
  form_submitted: Tag,
  tag_added: Tag,
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ContactProfileProps {
  contactId: string
  onBack: () => void
}

export function ContactProfile({ contactId, onBack }: ContactProfileProps) {
  const { data: contact, isLoading } = useContact(contactId)
  const { data: notes } = useContactNotes(contactId)
  const updateMutation = useUpdateContact()
  const addNoteMutation = useAddNote()

  const [noteContent, setNoteContent] = useState('')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState<Record<string, string>>({})

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-20 bg-zinc-800/50 rounded-lg animate-pulse" />
        <div className="h-40 bg-zinc-800/50 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!contact) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
        <p className="text-zinc-400">Contact non trouvé</p>
        <Button variant="ghost" onClick={onBack} className="mt-4 text-emerald-400">Retour</Button>
      </Card>
    )
  }

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ')
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const tags = (() => { try { return JSON.parse(contact.tags || '[]') as string[] } catch { return [] } })()

  const handleEdit = () => {
    setEditData({
      firstName: contact.firstName || '',
      lastName: contact.lastName,
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      jobTitle: contact.jobTitle || '',
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = () => {
    updateMutation.mutate(
      { id: contactId, data: editData },
      { onSuccess: () => setShowEditDialog(false) },
    )
  }

  const handleAddNote = () => {
    if (!noteContent.trim()) return
    addNoteMutation.mutate(
      { contactId, content: noteContent },
      { onSuccess: () => setNoteContent('') },
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-zinc-200 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-emerald-400">{initials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-zinc-100 truncate">{name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {contact.company && (
                  <span className="flex items-center gap-1 text-sm text-zinc-400">
                    <Building2 className="w-3.5 h-3.5" />{contact.company}
                  </span>
                )}
                <Badge className={`${lifecycleColors[contact.lifecycle] || ''} text-[10px] border-0`}>
                  {lifecycleLabels[contact.lifecycle] || contact.lifecycle}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] border-0">
                  Score: {contact.score}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors">
                <Mail className="w-4 h-4" />{contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors">
                <Phone className="w-4 h-4" />{contact.phone}
              </a>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={handleEdit} className="text-zinc-400 hover:text-emerald-400">
              <Edit2 className="w-4 h-4 mr-1" /> Modifier
            </Button>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {tags.map(t => (
                <Badge key={t} className="bg-zinc-800 text-zinc-300 text-[10px] border-zinc-700">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="activity" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Clock className="w-4 h-4 mr-1" /> Activité
          </TabsTrigger>
          <TabsTrigger value="deals" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Briefcase className="w-4 h-4 mr-1" /> Affaires ({contact._count?.deals || 0})
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <MessageSquare className="w-4 h-4 mr-1" /> Notes ({contact._count?.notes || 0})
          </TabsTrigger>
        </TabsList>

        {/* Activity Timeline */}
        <TabsContent value="activity">
          <ScrollArea className="max-h-[500px]">
            {contact.activities?.length ? (
              <div className="relative pl-6 space-y-4">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

                {contact.activities.map((activity: any) => {
                  const Icon = activityIcons[activity.type] || Clock
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative"
                    >
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <Icon className="w-3 h-3 text-emerald-400" />
                      </div>
                      <Card className="bg-zinc-900/50 border-zinc-800 p-3 ml-2">
                        <p className="text-sm text-zinc-200">{activity.title}</p>
                        {activity.description && (
                          <p className="text-xs text-zinc-500 mt-1">{activity.description}</p>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-1.5">
                          {new Date(activity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm text-center py-8">Aucune activité enregistrée</p>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Deals */}
        <TabsContent value="deals">
          {contact.deals?.length ? (
            <div className="space-y-2">
              {contact.deals.map((deal: any) => (
                <Card key={deal.id} className="bg-zinc-900/50 border-zinc-800 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{deal.title}</p>
                      <p className="text-xs text-zinc-500">
                        {deal.pipeline?.name} · {deal.status === 'open' ? 'Ouvert' : deal.status === 'won' ? 'Gagné' : 'Perdu'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-400">{deal.value.toLocaleString('fr-FR')} {deal.currency}</p>
                      <p className="text-xs text-zinc-500">{deal.probability}%</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm text-center py-8">Aucune affaire liée</p>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <div className="space-y-3">
            {/* Add Note */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Ajouter une note..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800 text-zinc-200 min-h-[60px] resize-none"
              />
              <Button
                onClick={handleAddNote}
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white self-end"
                size="icon"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Notes List */}
            {notes?.length ? (
              <div className="space-y-2">
                {notes.map((note: any) => (
                  <Card key={note.id} className="bg-zinc-900/50 border-zinc-800 p-3">
                    <div className="flex items-start gap-2">
                      {note.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-[10px] text-zinc-600 mt-1.5">
                          {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm text-center py-4">Aucune note</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Modifier le contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Prénom" value={editData.firstName || ''} onChange={e => setEditData(s => ({ ...s, firstName: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
              <Input placeholder="Nom" value={editData.lastName || ''} onChange={e => setEditData(s => ({ ...s, lastName: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
            </div>
            <Input placeholder="Email" value={editData.email || ''} onChange={e => setEditData(s => ({ ...s, email: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
            <Input placeholder="Téléphone" value={editData.phone || ''} onChange={e => setEditData(s => ({ ...s, phone: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
            <Input placeholder="Entreprise" value={editData.company || ''} onChange={e => setEditData(s => ({ ...s, company: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
            <Input placeholder="Poste" value={editData.jobTitle || ''} onChange={e => setEditData(s => ({ ...s, jobTitle: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
