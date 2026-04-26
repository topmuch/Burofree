'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Plus, Eye, CheckCircle2, Trash2, AlertTriangle,
  TrendingUp, Clock, AlertCircle, DollarSign, FileText, FileSpreadsheet,
  Send, CalendarDays, X, PlusCircle, MinusCircle, Printer
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { useAppStore, type Invoice } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

const statusConfig: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  draft: { label: 'Brouillon', className: 'bg-zinc-500/20 text-zinc-400' },
  sent: { label: 'Envoyée', className: 'bg-amber-500/20 text-amber-400' },
  paid: { label: 'Payée', className: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  overdue: { label: 'En retard', className: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  cancelled: { label: 'Annulée', className: 'bg-zinc-500/20 text-zinc-400' },
}

const typeLabels: Record<string, string> = {
  quote: 'Devis',
  invoice: 'Facture',
}

function CreateInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { projects, invoices, createInvoice } = useAppStore()
  const [type, setType] = useState<'invoice' | 'quote'>('invoice')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 }
  ])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  const nextNumber = useMemo(() => {
    const prefix = type === 'invoice' ? 'FAC' : 'DEV'
    const existing = invoices.filter(i => i.type === type)
    const maxNum = existing.reduce((max, inv) => {
      const match = inv.number.match(/(\d+)$/)
      return match ? Math.max(max, parseInt(match[1])) : max
    }, 0)
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`
  }, [type, invoices])

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxRate = 20
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast.error('Le nom du client est requis')
      return
    }
    const validItems = lineItems.filter(i => i.description.trim())
    if (validItems.length === 0) {
      toast.error('Au moins une ligne est requise')
      return
    }
    setSaving(true)
    try {
      await createInvoice({
        number: nextNumber,
        type,
        clientName,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        items: JSON.stringify(validItems),
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: 'EUR',
        status: 'draft',
        dueDate: dueDate || null,
        notes: notes || null,
        projectId: projectId || null,
      } as Partial<Invoice>)
      toast.success(type === 'invoice' ? 'Facture créée' : 'Devis créé')
      onOpenChange(false)
      // Reset form
      setClientName('')
      setClientEmail('')
      setClientAddress('')
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }])
      setDueDate('')
      setNotes('')
      setProjectId('')
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Nouveau document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Type & Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'invoice' | 'quote')}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="quote">Devis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Numéro</Label>
              <Input value={nextNumber} readOnly className="bg-secondary opacity-70" />
            </div>
          </div>

          {/* Client */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Client</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nom *</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom du client" className="bg-secondary" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@client.fr" className="bg-secondary" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Adresse</Label>
              <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Adresse du client" className="bg-secondary" />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Lignes</Label>
              <Button variant="ghost" size="sm" onClick={addLineItem} className="text-emerald-400 hover:text-emerald-300">
                <PlusCircle className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2"
                >
                  <div className="flex-1">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="bg-secondary text-sm"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="bg-secondary text-sm text-center"
                      min={0}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="bg-secondary text-sm text-right"
                      placeholder="Prix"
                      min={0}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-400 hover:text-red-300 flex-shrink-0"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length <= 1}
                  >
                    <MinusCircle className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{subtotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA ({taxRate}%)</span>
                <span>{taxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
                <span>Total</span>
                <span className="text-emerald-400">{total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>
          </div>

          {/* Date & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date d&apos;échéance</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Projet</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Aucun projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes ou conditions..."
              className="bg-secondary min-h-[80px]"
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
            {saving ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InvoicingPanel() {
  const { invoices, projects, stats, createInvoice, updateInvoice, deleteInvoice } = useAppStore()
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'quote'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchType = typeFilter === 'all' || inv.type === typeFilter
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchType && matchStatus
    })
  }, [invoices, typeFilter, statusFilter])

  const formatCurrency = (amount: number, currency: string = 'EUR') =>
    amount.toLocaleString('fr-FR', { style: 'currency', currency })

  const handleMarkPaid = async (id: string) => {
    await updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() })
    toast.success('Facture marquée comme payée')
  }

  const handleDelete = async (id: string) => {
    await deleteInvoice(id)
    toast.success('Document supprimé')
  }

  const handleSendReminder = (invoice: Invoice) => {
    toast.success(`Relance envoyée pour ${invoice.number}`)
  }

  const isOverdue = (invoice: Invoice) =>
    invoice.status !== 'paid' && invoice.status !== 'cancelled' &&
    invoice.dueDate && new Date(invoice.dueDate) < new Date()

  // Revenue chart data from stats
  const revenueChartData = useMemo(() => {
    if (stats?.monthlyData && stats.monthlyData.length > 0) {
      return stats.monthlyData.slice(-6)
    }
    // Generate placeholder data
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin']
    return months.map(month => ({ month, revenue: 0 }))
  }, [stats])

  const statCards = [
    {
      title: 'CA du mois',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      icon: TrendingUp,
      accent: 'text-emerald-400',
      bgAccent: 'bg-emerald-500/10',
      borderAccent: 'border-emerald-500/20',
    },
    {
      title: 'Factures en attente',
      value: String(stats?.pendingInvoices || 0),
      icon: Clock,
      accent: 'text-amber-400',
      bgAccent: 'bg-amber-500/10',
      borderAccent: 'border-amber-500/20',
    },
    {
      title: 'Factures en retard',
      value: String(stats?.overdueInvoices || 0),
      icon: AlertCircle,
      accent: 'text-red-400',
      bgAccent: 'bg-red-500/10',
      borderAccent: 'border-red-500/20',
    },
    {
      title: 'Total annuel',
      value: formatCurrency(stats?.yearlyRevenue || 0),
      icon: DollarSign,
      accent: 'text-zinc-300',
      bgAccent: 'bg-zinc-500/10',
      borderAccent: 'border-zinc-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="quote">Devis</TabsTrigger>
              <TabsTrigger value="invoice">Factures</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-secondary text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyée</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setCreateOpen(true) }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Nouveau devis
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Invoice/Quote Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Receipt className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm">Aucun document trouvé</p>
                        <p className="text-xs mt-1">Créez votre premier devis ou facture</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const overdue = isOverdue(invoice)
                    const statusKey = overdue ? 'overdue' : invoice.status
                    const config = statusConfig[statusKey] || statusConfig.draft

                    return (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/50 border-b transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                            <span>{invoice.number}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{invoice.clientName}</p>
                            {invoice.clientEmail && (
                              <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            invoice.type === 'quote'
                              ? 'border-amber-500/30 text-amber-400'
                              : 'border-emerald-500/30 text-emerald-400'
                          )}>
                            {typeLabels[invoice.type] || invoice.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', config.className)}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate ? (
                            <span className={cn(
                              'text-xs',
                              overdue ? 'text-red-400 font-medium' : 'text-muted-foreground'
                            )}>
                              {new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewInvoice(invoice)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
                              onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                              title="Voir / Imprimer PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                            {overdue && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-red-400 hover:text-red-300"
                                onClick={() => handleSendReminder(invoice)}
                              >
                                <Send className="w-3.5 h-3.5 mr-1" /> Relance
                              </Button>
                            )}
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-emerald-400 hover:text-emerald-300"
                                onClick={() => handleMarkPaid(invoice.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Payée
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(invoice.id)}
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

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Revenus mensuels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
                tickFormatter={(v: number) => `${v.toLocaleString('fr-FR')} €`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} €`, 'Revenu']}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenu" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => { if (!open) setViewInvoice(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              {viewInvoice?.number}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Type :</span>
                  <Badge variant="outline" className={cn(
                    'ml-2 text-xs',
                    viewInvoice.type === 'quote'
                      ? 'border-amber-500/30 text-amber-400'
                      : 'border-emerald-500/30 text-emerald-400'
                  )}>
                    {typeLabels[viewInvoice.type] || viewInvoice.type}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut :</span>
                  <Badge className={cn('ml-2 text-xs', (statusConfig[viewInvoice.status] || statusConfig.draft).className)}>
                    {(statusConfig[viewInvoice.status] || statusConfig.draft).label}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <p><span className="text-muted-foreground">Client :</span> {viewInvoice.clientName}</p>
                {viewInvoice.clientEmail && <p><span className="text-muted-foreground">Email :</span> {viewInvoice.clientEmail}</p>}
                {viewInvoice.clientAddress && <p><span className="text-muted-foreground">Adresse :</span> {viewInvoice.clientAddress}</p>}
                {viewInvoice.dueDate && (
                  <p><span className="text-muted-foreground">Échéance :</span> {new Date(viewInvoice.dueDate).toLocaleDateString('fr-FR')}</p>
                )}
                {viewInvoice.paidAt && (
                  <p><span className="text-muted-foreground">Payée le :</span> {new Date(viewInvoice.paidAt).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{formatCurrency(viewInvoice.subtotal, viewInvoice.currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TVA ({viewInvoice.taxRate}%)</span><span>{formatCurrency(viewInvoice.taxAmount, viewInvoice.currency)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="text-emerald-400">{formatCurrency(viewInvoice.total, viewInvoice.currency)}</span>
                </div>
              </div>
              {viewInvoice.notes && (
                <div className="bg-secondary/50 p-3 rounded-lg text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p>{viewInvoice.notes}</p>
                </div>
              )}
              {viewInvoice.project && (
                <Badge variant="outline" className="text-xs" style={{ borderColor: viewInvoice.project.color, color: viewInvoice.project.color }}>
                  {viewInvoice.project.name}
                </Badge>
              )}
              <Button
                onClick={() => window.open(`/api/invoices/${viewInvoice.id}/pdf`, '_blank')}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                size="sm"
              >
                <Printer className="w-4 h-4 mr-2" /> Voir / Imprimer PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
