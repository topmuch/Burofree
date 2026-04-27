'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Eye, Trash2, CheckCircle2, Clock, AlertTriangle,
  DollarSign, Send, FileCheck, FileWarning, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { useAppStore, type Contract } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Status config ──────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  draft: { label: 'Brouillon', className: 'bg-zinc-500/20 text-zinc-400' },
  sent: { label: 'Envoy\u00e9', className: 'bg-amber-500/20 text-amber-400', icon: Send },
  signed: { label: 'Sign\u00e9', className: 'bg-sky-500/20 text-sky-400', icon: FileCheck },
  active: { label: 'Actif', className: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  expired: { label: 'Expir\u00e9', className: 'bg-red-500/20 text-red-400', icon: FileWarning },
  terminated: { label: 'R\u00e9sili\u00e9', className: 'bg-zinc-500/20 text-zinc-500', icon: AlertTriangle },
}

const typeConfig: Record<string, { label: string; className: string }> = {
  service: { label: 'Service', className: 'border-emerald-500/30 text-emerald-400' },
  nda: { label: 'NDA', className: 'border-amber-500/30 text-amber-400' },
  partnership: { label: 'Partenariat', className: 'border-sky-500/30 text-sky-400' },
  freelance: { label: 'Freelance', className: 'border-purple-500/30 text-purple-400' },
}

// ── Create Contract Dialog ─────────────────────────────────────────────────────

function CreateContractDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { projects, createContract } = useAppStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'service' | 'nda' | 'partnership' | 'freelance'>('service')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setType('service')
    setClientName('')
    setClientEmail('')
    setClientAddress('')
    setStartDate('')
    setEndDate('')
    setValue('')
    setCurrency('EUR')
    setTerms('')
    setNotes('')
    setProjectId('')
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    if (!clientName.trim()) {
      toast.error('Le nom du client est requis')
      return
    }
    setSaving(true)
    try {
      await createContract({
        title,
        description: description || null,
        type,
        status: 'draft',
        clientName,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        startDate: startDate || null,
        endDate: endDate || null,
        value: value ? parseFloat(value) : null,
        currency,
        terms: terms || null,
        notes: notes || null,
        projectId: projectId || null,
      } as Partial<Contract>)
      toast.success('Contrat cr\u00e9\u00e9')
      onOpenChange(false)
      resetForm()
    } catch {
      toast.error('Erreur lors de la cr\u00e9ation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Nouveau contrat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du contrat"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="nda">NDA</SelectItem>
                  <SelectItem value="partnership">Partenariat</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du contrat..."
              className="bg-secondary min-h-[80px]"
            />
          </div>

          {/* Client */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Client</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nom *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom du client"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email@client.fr"
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Adresse</Label>
              <Input
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Adresse du client"
                className="bg-secondary"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de d\u00e9but</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-secondary"
              />
            </div>
          </div>

          {/* Value & Currency */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>Valeur</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="bg-secondary"
                min={0}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (\u20ac)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (\u00a3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Projet</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Aucun projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Label>Conditions</Label>
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Conditions du contrat..."
              className="bg-secondary min-h-[80px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes..."
              className="bg-secondary min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {saving ? 'Cr\u00e9ation...' : 'Cr\u00e9er le contrat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── View Contract Dialog ───────────────────────────────────────────────────────

function ViewContractDialog({
  contract,
  open,
  onOpenChange,
  onStatusChange,
}: {
  contract: Contract | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [newStatus, setNewStatus] = useState('')

  if (!contract) return null

  const config = statusConfig[contract.status] || statusConfig.draft
  const tConfig = typeConfig[contract.type] || { label: contract.type, className: 'border-zinc-500/30 text-zinc-400' }

  const formatCurrency = (amount: number, curr: string = 'EUR') =>
    amount.toLocaleString('fr-FR', { style: 'currency', currency: curr })

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014'

  const handleStatusUpdate = () => {
    if (newStatus && newStatus !== contract.status) {
      onStatusChange(contract.id, newStatus)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            {contract.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Type :</span>
              <Badge variant="outline" className={cn('text-xs', tConfig.className)}>
                {tConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut :</span>
              <Badge className={cn('text-xs', config.className)}>
                {config.label}
              </Badge>
            </div>
          </div>

          {/* Client details */}
          <div className="space-y-1.5 text-sm">
            <p><span className="text-muted-foreground">Client :</span> {contract.clientName}</p>
            {contract.clientEmail && <p><span className="text-muted-foreground">Email :</span> {contract.clientEmail}</p>}
            {contract.clientAddress && <p><span className="text-muted-foreground">Adresse :</span> {contract.clientAddress}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">D\u00e9but :</span>{' '}
              <span>{formatDate(contract.startDate)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fin :</span>{' '}
              <span>{formatDate(contract.endDate)}</span>
            </div>
          </div>

          {/* Value */}
          {contract.value != null && (
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-base font-bold">
                <span>Valeur</span>
                <span className="text-emerald-400">{formatCurrency(contract.value, contract.currency)}</span>
              </div>
            </div>
          )}

          {/* Description */}
          {contract.description && (
            <div className="bg-secondary/50 p-3 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p>{contract.description}</p>
            </div>
          )}

          {/* Terms */}
          {contract.terms && (
            <div className="bg-secondary/50 p-3 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Conditions</p>
              <p>{contract.terms}</p>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div className="bg-secondary/50 p-3 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p>{contract.notes}</p>
            </div>
          )}

          {/* Project */}
          {contract.project && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderColor: contract.project.color, color: contract.project.color }}
            >
              {contract.project.name}
            </Badge>
          )}

          {/* Change Status */}
          <div className="border-t border-border pt-3 space-y-3">
            <Label className="text-sm font-medium">Modifier le statut</Label>
            <div className="flex items-center gap-2">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-secondary flex-1">
                  <SelectValue placeholder={config.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoy\u00e9</SelectItem>
                  <SelectItem value="signed">Sign\u00e9</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="expired">Expir\u00e9</SelectItem>
                  <SelectItem value="terminated">R\u00e9sili\u00e9</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleStatusUpdate}
                disabled={!newStatus || newStatus === contract.status}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function ContractsPanel() {
  const { contracts, projects, createContract, updateContract, deleteContract } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewContract, setViewContract] = useState<Contract | null>(null)

  // ── Computed ────────────────────────────────────────────────────────────────

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchType = typeFilter === 'all' || c.type === typeFilter
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchType && matchStatus
    })
  }, [contracts, typeFilter, statusFilter])

  const activeCount = useMemo(() => contracts.filter((c) => c.status === 'active').length, [contracts])
  const pendingSignatureCount = useMemo(() => contracts.filter((c) => c.status === 'sent' || c.status === 'signed').length, [contracts])
  const totalValue = useMemo(
    () => contracts.filter((c) => c.status === 'active' && c.value != null).reduce((sum, c) => sum + (c.value ?? 0), 0),
    [contracts]
  )

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: number, currency: string = 'EUR') =>
    amount.toLocaleString('fr-FR', { style: 'currency', currency })

  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '\u2014'

  const isExpired = (contract: Contract) =>
    contract.status === 'active' && contract.endDate && new Date(contract.endDate) < new Date()

  const handleStatusChange = async (id: string, status: string) => {
    await updateContract(id, { status })
    toast.success('Statut mis \u00e0 jour')
  }

  const handleDelete = async (id: string) => {
    await deleteContract(id)
    toast.success('Contrat supprim\u00e9')
  }

  // ── Stat Cards ──────────────────────────────────────────────────────────────

  const statCards = [
    {
      title: 'Contrats actifs',
      value: String(activeCount),
      icon: FileCheck,
      accent: 'text-emerald-400',
      bgAccent: 'bg-emerald-500/10',
      borderAccent: 'border-emerald-500/20',
    },
    {
      title: 'En attente de signature',
      value: String(pendingSignatureCount),
      icon: Clock,
      accent: 'text-amber-400',
      bgAccent: 'bg-amber-500/10',
      borderAccent: 'border-amber-500/20',
    },
    {
      title: 'Valeur totale',
      value: formatCurrency(totalValue),
      icon: DollarSign,
      accent: 'text-zinc-300',
      bgAccent: 'bg-zinc-500/10',
      borderAccent: 'border-zinc-500/20',
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="service">Service</TabsTrigger>
              <TabsTrigger value="nda">NDA</TabsTrigger>
              <TabsTrigger value="partnership">Partenariat</TabsTrigger>
              <TabsTrigger value="freelance">Freelance</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-secondary text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoy\u00e9</SelectItem>
              <SelectItem value="signed">Sign\u00e9</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="expired">Expir\u00e9</SelectItem>
              <SelectItem value="terminated">R\u00e9sili\u00e9</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Nouveau contrat
        </Button>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>D\u00e9but</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead className="text-right">Valeur</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm">Aucun contrat trouv\u00e9</p>
                        <p className="text-xs mt-1">Cr\u00e9ez votre premier contrat</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map((contract) => {
                    const expired = isExpired(contract)
                    const statusKey = expired ? 'expired' : contract.status
                    const sConfig = statusConfig[statusKey] || statusConfig.draft
                    const tConfig = typeConfig[contract.type] || { label: contract.type, className: 'border-zinc-500/30 text-zinc-400' }

                    return (
                      <motion.tr
                        key={contract.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/50 border-b transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {expired && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                            <span className="truncate max-w-[200px]">{contract.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', tConfig.className)}>
                            {tConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{contract.clientName}</p>
                            {contract.clientEmail && (
                              <p className="text-xs text-muted-foreground">{contract.clientEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', sConfig.className)}>
                            {sConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(contract.startDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'text-xs',
                            expired ? 'text-red-400 font-medium' : 'text-muted-foreground'
                          )}>
                            {formatDate(contract.endDate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {contract.value != null
                            ? formatCurrency(contract.value, contract.currency)
                            : <span className="text-muted-foreground">\u2014</span>
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewContract(contract)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(contract.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Contract Dialog */}
      <CreateContractDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* View Contract Dialog */}
      <ViewContractDialog
        contract={viewContract}
        open={!!viewContract}
        onOpenChange={(open) => { if (!open) setViewContract(null) }}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
