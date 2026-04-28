'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Plus, Eye, CheckCircle2, Trash2, AlertTriangle,
  TrendingUp, Clock, AlertCircle, DollarSign, FileText, FileSpreadsheet,
  Send, CalendarDays, X, PlusCircle, MinusCircle, Printer, Mail, Loader2,
  CreditCard, ExternalLink
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
import { StripePaymentButton, PaymentMethodBadge } from '@/components/stripe-payment-button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

const statusConfig: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  draft: { label: 'Brouillon', className: 'bg-zinc-500/20 text-zinc-400' },
  sent: { label: 'Envoy\u00e9e', className: 'bg-amber-500/20 text-amber-400' },
  paid: { label: 'Pay\u00e9e', className: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  overdue: { label: 'En retard', className: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  cancelled: { label: 'Annul\u00e9e', className: 'bg-zinc-500/20 text-zinc-400' },
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
      toast.success(type === 'invoice' ? 'Facture cr\u00e9\u00e9e' : 'Devis cr\u00e9\u00e9')
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
              <Label>Num\u00e9ro</Label>
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
              <Label>Date d&apos;\u00e9ch\u00e9ance</Label>
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
            {saving ? 'Cr\u00e9ation...' : 'Cr\u00e9er'}
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
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [openingPdf, setOpeningPdf] = useState<string | null>(null)

  /**
   * Open the invoice PDF in a new tab with a token for authentication.
   * Fetches a HMAC token from the server, then opens the PDF URL with it.
   */
  const handleOpenPdf = useCallback(async (invoiceId: string) => {
    setOpeningPdf(invoiceId)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf-token`)
      if (res.ok) {
        const data = await res.json()
        window.open(`/api/invoices/${invoiceId}/pdf?token=${data.token}`, '_blank')
      } else {
        toast.error('Impossible de g\u00e9n\u00e9rer le lien PDF')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setOpeningPdf(null)
    }
  }, [])

  /**
   * Print the current invoice from the dialog.
   * Uses window.print() with print-optimized CSS.
   */
  const handlePrintInvoice = useCallback(() => {
    window.print()
  }, [])

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
    toast.success('Facture marqu\u00e9e comme pay\u00e9e')
  }

  const handleDelete = async (id: string) => {
    await deleteInvoice(id)
    toast.success('Document supprim\u00e9')
  }

  const handleSendEmail = async (invoice: Invoice) => {
    setSendingEmail(invoice.id)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Facture envoy\u00e9e par email')
        useAppStore.getState().fetchInvoices()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de l\'envoi')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSendingEmail(null)
    }
  }

  const handleSendReminder = async (invoice: Invoice) => {
    setSendingReminder(invoice.id)
    try {
      const res = await fetch('/api/invoices/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Relance envoy\u00e9e')
        useAppStore.getState().fetchInvoices()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la relance')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSendingReminder(null)
    }
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
    const months = ['Jan', 'F\u00e9v', 'Mar', 'Avr', 'Mai', 'Juin']
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
              <SelectItem value="sent">Envoy\u00e9e</SelectItem>
              <SelectItem value="paid">Pay\u00e9e</SelectItem>
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
                <TableHead>Num\u00e9ro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>\u00c9ch\u00e9ance</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Receipt className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm">Aucun document trouv\u00e9</p>
                        <p className="text-xs mt-1">Cr\u00e9ez votre premier devis ou facture</p>
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
                            <span className="text-xs text-muted-foreground">\u2014</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PaymentMethodBadge invoice={invoice} />
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
                              onClick={() => handleOpenPdf(invoice.id)}
                              disabled={openingPdf === invoice.id}
                              title="Voir / Imprimer PDF"
                            >
                              {openingPdf === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                            </Button>
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.clientEmail && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-400 hover:text-amber-300"
                                onClick={() => handleSendEmail(invoice)}
                                disabled={sendingEmail === invoice.id}
                                title="Envoyer par email"
                              >
                                {sendingEmail === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                            {overdue && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-red-400 hover:text-red-300"
                                onClick={() => handleSendReminder(invoice)}
                                disabled={sendingReminder === invoice.id}
                              >
                                {sendingReminder === invoice.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />} Relance
                              </Button>
                            )}
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <StripePaymentButton invoice={invoice} compact onPaymentInitiated={() => useAppStore.getState().fetchInvoices()} />
                            )}
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-emerald-400 hover:text-emerald-300"
                                onClick={() => handleMarkPaid(invoice.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pay\u00e9e
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
                tickFormatter={(v: number) => `${v.toLocaleString('fr-FR')} \u20AC`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} \u20AC`, 'Revenu']}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              {viewInvoice?.number}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              {/* Print header - only visible when printing */}
              <div className="hidden print:block print:mb-8">
                <div className="flex justify-between items-start border-b-2 border-emerald-500 pb-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-emerald-600">Burozen</h1>
                    <p className="text-sm text-gray-500">{typeLabels[viewInvoice.type] || viewInvoice.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{viewInvoice.number}</p>
                    <p className="text-sm text-gray-500">{new Date(viewInvoice.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>

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
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Statut :</span>
                  <Badge className={cn('text-xs', (statusConfig[viewInvoice.status] || statusConfig.draft).className)}>
                    {(statusConfig[viewInvoice.status] || statusConfig.draft).label}
                  </Badge>
                  <PaymentMethodBadge invoice={viewInvoice} />
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <p><span className="text-muted-foreground">Client :</span> {viewInvoice.clientName}</p>
                {viewInvoice.clientEmail && <p><span className="text-muted-foreground">Email :</span> {viewInvoice.clientEmail}</p>}
                {viewInvoice.clientAddress && <p><span className="text-muted-foreground">Adresse :</span> {viewInvoice.clientAddress}</p>}
                {viewInvoice.dueDate && (
                  <p><span className="text-muted-foreground">\u00c9ch\u00e9ance :</span> {new Date(viewInvoice.dueDate).toLocaleDateString('fr-FR')}</p>
                )}
                {viewInvoice.paidAt && (
                  <p><span className="text-muted-foreground">Pay\u00e9e le :</span> {new Date(viewInvoice.paidAt).toLocaleDateString('fr-FR')}</p>
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

              {/* Action buttons - hidden when printing */}
              <div className="space-y-2 pt-2 border-t border-border print:hidden">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleOpenPdf(viewInvoice.id)}
                    disabled={openingPdf === viewInvoice.id}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    size="sm"
                  >
                    {openingPdf === viewInvoice.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                    Voir PDF
                  </Button>
                  <Button
                    onClick={handlePrintInvoice}
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    size="sm"
                  >
                    <Printer className="w-4 h-4 mr-2" /> Imprimer
                  </Button>
                </div>

                {viewInvoice.clientEmail && viewInvoice.status !== 'paid' && viewInvoice.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    size="sm"
                    onClick={() => { handleSendEmail(viewInvoice); setViewInvoice(null) }}
                    disabled={sendingEmail === viewInvoice.id}
                  >
                    {sendingEmail === viewInvoice.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Envoyer par email
                  </Button>
                )}

                {/* Stripe Payment Button */}
                {viewInvoice.status !== 'paid' && viewInvoice.status !== 'cancelled' && (
                  <StripePaymentButton
                    invoice={viewInvoice}
                    onPaymentInitiated={() => useAppStore.getState().fetchInvoices()}
                  />
                )}

                {/* Already paid via Stripe */}
                {viewInvoice.status === 'paid' && viewInvoice.paymentMethod === 'stripe' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Pay\u00e9 via Stripe
                    {viewInvoice.stripePaymentIntentId && (
                      <span className="text-xs text-muted-foreground">({viewInvoice.stripePaymentIntentId.slice(0, 12)}...)</span>
                    )}
                  </div>
                )}

                {/* Mark as paid manually */}
                {viewInvoice.status !== 'paid' && viewInvoice.status !== 'cancelled' && (
                  <Button
                    variant="ghost"
                    className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    size="sm"
                    onClick={() => { handleMarkPaid(viewInvoice.id); setViewInvoice(null) }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marquer comme pay\u00e9e (manuel)
                  </Button>
                )}
              </div>

              {/* Print footer - only visible when printing */}
              <div className="hidden print:block print:mt-8 print:pt-4 print:border-t print:border-gray-200 print:text-xs print:text-gray-400">
                <p>G\u00e9n\u00e9r\u00e9 par Burozen \u00b7 {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
