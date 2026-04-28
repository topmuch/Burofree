'use client'

import { useState, useMemo } from 'react'
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Plus, Download, Upload, MoreHorizontal, Trash2,
  Tag, UserPlus, Mail, Phone, Building2, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useContacts, useCreateContact, useDeleteContact, useImportContacts } from '../hooks/use-crm'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContactRow {
  id: string
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  jobTitle: string | null
  lifecycle: string
  score: number
  tags: string
  lastActivityAt: string | null
  status: string
  source: string
  _count?: { activities: number; notes: number; deals: number }
}

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

// ─── Component ──────────────────────────────────────────────────────────────

interface ContactDataGridProps {
  onSelectContact: (id: string) => void
}

export function ContactDataGrid({ onSelectContact }: ContactDataGridProps) {
  const [search, setSearch] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sorting, setSorting] = useState<any[]>([])
  const [rowSelection, setRowSelection] = useState({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Build query filters
  const filters: Record<string, string> = {}
  if (search) filters.search = search
  if (lifecycleFilter) filters.lifecycle = lifecycleFilter
  if (statusFilter) filters.status = statusFilter
  filters.limit = '50'

  const { data, isLoading } = useContacts(filters)
  const createMutation = useCreateContact()
  const deleteMutation = useDeleteContact()
  const importMutation = useImportContacts()

  const contacts = data?.data || []

  // ─── Table Definition ─────────────────────────────────────────────────────

  const columnHelper = createColumnHelper<ContactRow>()

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          className="border-zinc-600"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          className="border-zinc-600"
        />
      ),
      size: 40,
    }),
    columnHelper.accessor('lastName', {
      header: 'Nom',
      cell: ({ row }) => {
        const c = row.original
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
        return (
          <button
            onClick={() => onSelectContact(c.id)}
            className="flex items-center gap-2 text-left hover:text-emerald-400 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-emerald-400">
                {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{name}</p>
              {c.jobTitle && <p className="text-xs text-zinc-500 truncate">{c.jobTitle}</p>}
            </div>
          </button>
        )
      },
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-400">{getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Téléphone',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-400">{getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('company', {
      header: 'Entreprise',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-400 flex items-center gap-1">
          {getValue() ? <><Building2 className="w-3 h-3" />{getValue()}</> : '—'}
        </span>
      ),
    }),
    columnHelper.accessor('lifecycle', {
      header: 'Cycle',
      cell: ({ getValue }) => {
        const v = getValue()
        return (
          <Badge className={`${lifecycleColors[v] || 'bg-zinc-500/20 text-zinc-300'} text-[10px] border-0`}>
            {lifecycleLabels[v] || v}
          </Badge>
        )
      },
    }),
    columnHelper.accessor('score', {
      header: 'Score',
      cell: ({ getValue }) => {
        const s = getValue()
        const color = s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-amber-400' : 'text-zinc-400'
        return <span className={`text-sm font-medium ${color}`}>{s}</span>
      },
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      cell: ({ getValue }) => {
        try {
          const tags = JSON.parse(getValue()) as string[]
          if (!tags.length) return <span className="text-zinc-600">—</span>
          return (
            <div className="flex gap-1 flex-wrap">
              {tags.slice(0, 2).map(t => (
                <Badge key={t} className="bg-zinc-800 text-zinc-300 text-[10px] border-zinc-700">{t}</Badge>
              ))}
              {tags.length > 2 && <Badge className="bg-zinc-800 text-zinc-500 text-[10px] border-zinc-700">+{tags.length - 2}</Badge>}
            </div>
          )
        } catch {
          return <span className="text-zinc-600">—</span>
        }
      },
    }),
    columnHelper.accessor('lastActivityAt', {
      header: 'Dernière activité',
      cell: ({ getValue }) => {
        const v = getValue()
        if (!v) return <span className="text-zinc-600">—</span>
        const date = new Date(v)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const days = Math.floor(diff / 86400000)
        return (
          <span className="text-xs text-zinc-500">
            {days === 0 ? "Aujourd'hui" : days === 1 ? 'Hier' : `${days}j`}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-300">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={() => onSelectContact(row.original.id)} className="text-zinc-300">
              Voir le profil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteMutation.mutate(row.original.id)}
              className="text-red-400 focus:text-red-300"
            >
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 40,
    }),
  ], [columnHelper, onSelectContact, deleteMutation])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's useReactTable returns functions that cannot be safely memoized
  const table = useReactTable({
    data: contacts,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  })

  // ─── Create Contact Form ──────────────────────────────────────────────────

  const [newContact, setNewContact] = useState({
    firstName: '', lastName: '', email: '', phone: '', company: '', jobTitle: '',
  })

  const handleCreate = () => {
    createMutation.mutate(newContact, {
      onSuccess: () => {
        setShowCreateDialog(false)
        setNewContact({ firstName: '', lastName: '', email: '', phone: '', company: '', jobTitle: '' })
      },
    })
  }

  // ─── Import CSV ───────────────────────────────────────────────────────────

  const [csvText, setCsvText] = useState('')

  const handleImport = () => {
    if (!csvText.trim()) return
    importMutation.mutate({ data: csvText }, {
      onSuccess: () => {
        setShowImportDialog(false)
        setCsvText('')
      },
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  // ─── Bulk Actions ─────────────────────────────────────────────────────────

  const selectedCount = Object.keys(rowSelection).length

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
            <SelectTrigger className="w-[140px] bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs h-8">
              <SelectValue placeholder="Tous les cycles" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="">Tous les cycles</SelectItem>
              <SelectItem value="lead">Prospect</SelectItem>
              <SelectItem value="qualified">Qualifié</SelectItem>
              <SelectItem value="opportunity">Opportunité</SelectItem>
              <SelectItem value="customer">Client</SelectItem>
              <SelectItem value="churned">Perdu</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30">
                <Plus className="w-4 h-4 mr-1" /> Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Nouveau contact</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Prénom" value={newContact.firstName} onChange={e => setNewContact(s => ({ ...s, firstName: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
                  <Input placeholder="Nom *" value={newContact.lastName} onChange={e => setNewContact(s => ({ ...s, lastName: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
                </div>
                <Input placeholder="Email" type="email" value={newContact.email} onChange={e => setNewContact(s => ({ ...s, email: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
                <Input placeholder="Téléphone" value={newContact.phone} onChange={e => setNewContact(s => ({ ...s, phone: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
                <Input placeholder="Entreprise" value={newContact.company} onChange={e => setNewContact(s => ({ ...s, company: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
                <Input placeholder="Poste" value={newContact.jobTitle} onChange={e => setNewContact(s => ({ ...s, jobTitle: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-200" />
                <Button onClick={handleCreate} disabled={!newContact.lastName || createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {createMutation.isPending ? 'Création...' : 'Créer le contact'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Upload className="w-4 h-4 mr-1" /> Importer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Importer des contacts (CSV)</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="text-sm text-zinc-300" />
                <textarea
                  placeholder="Ou collez votre CSV ici..."
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full h-32 rounded-md bg-zinc-800/50 border-zinc-700 text-zinc-200 text-sm p-3 resize-none"
                />
                <p className="text-xs text-zinc-500">Colonnes supportées: firstName, lastName, email, phone, company, jobTitle</p>
                <Button onClick={handleImport} disabled={!csvText.trim() || importMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                  {importMutation.isPending ? 'Import...' : 'Importer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => {
              const params = new URLSearchParams(filters)
              window.open(`/api/crm/contacts/export?${params.toString()}`, '_blank')
            }}
          >
            <Download className="w-4 h-4 mr-1" /> Exporter
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
          >
            <span className="text-sm text-emerald-400 font-medium">{selectedCount} sélectionné(s)</span>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-red-400">
              <Trash2 className="w-4 h-4 mr-1" /> Supprimer
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-zinc-800/50" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-zinc-300 font-medium">Aucun contact</p>
          <p className="text-zinc-500 text-sm mt-1">Créez votre premier contact ou importez un fichier CSV</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} className="bg-zinc-900/80">
                    {hg.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 select-none"
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: <ChevronUp className="w-3 h-3" />, desc: <ChevronDown className="w-3 h-3" /> }[header.column.getIsSorted() as string] ?? (header.column.getCanSort() ? <ChevronsUpDown className="w-3 h-3 opacity-30" /> : null)}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {contacts.map(c => {
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
              return (
                <Card
                  key={c.id}
                  className="bg-zinc-900/50 border-zinc-800 p-3 cursor-pointer hover:border-emerald-500/30 transition-colors"
                  onClick={() => onSelectContact(c.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-emerald-400">
                        {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-200 truncate">{name}</p>
                        <Badge className={`${lifecycleColors[c.lifecycle] || ''} text-[10px] border-0`}>
                          {lifecycleLabels[c.lifecycle] || c.lifecycle}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        {c.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-emerald-400">{c.score}</span>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{data?.total || 0} contact(s)</span>
            {data?.nextCursor && (
              <Button variant="ghost" size="sm" className="text-zinc-400">
                Charger plus
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
