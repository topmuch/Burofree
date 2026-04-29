'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldBan,
  ShieldCheck,
  LogOut,
  KeyRound,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  status: 'active' | 'suspended'
  plan: string
  createdAt: string
  lastActivity: string | null
}

interface UsersResponse {
  users: UserRow[]
  nextCursor: string | null
  hasMore: boolean
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function statusBadge(status: string) {
  if (status === 'active') {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" variant="outline">Actif</Badge>
  }
  return <Badge className="bg-red-500/15 text-red-400 border-red-500/30" variant="outline">Suspendu</Badge>
}

function planBadge(plan: string) {
  const styles: Record<string, string> = {
    free: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    pro: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    enterprise: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  }
  return (
    <Badge className={styles[plan] || styles.free} variant="outline">
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  )
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  /* ── Debounced Search ───────────────────────────────────────────────────── */

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  /* ── Fetch Users ────────────────────────────────────────────────────────── */

  const fetchUsers = useCallback(async (loadMore = false) => {
    try {
      if (!loadMore) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams()
      params.set('limit', '25')
      if (loadMore && cursor) params.set('cursor', cursor)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (planFilter !== 'all') params.set('plan', planFilter)

      const res = await fetch(`/api/superadmin/users?${params.toString()}`)
      if (res.ok) {
        const json: UsersResponse = await res.json()
        if (loadMore) {
          setUsers((prev) => [...prev, ...json.users])
        } else {
          setUsers(json.users)
        }
        setCursor(json.nextCursor)
        setHasMore(json.hasMore)
      }
    } catch (err) {
      console.error('Erreur chargement utilisateurs :', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor, debouncedSearch, statusFilter, planFilter])

  useEffect(() => {
    setCursor(null)
    setUsers([])
    setSelectedRows(new Set())
    setExpandedRow(null)
    fetchUsers(false)
  }, [debouncedSearch, statusFilter, planFilter])

  /* ── Bulk Actions ───────────────────────────────────────────────────────── */

  const handleBulkAction = async (action: 'suspend' | 'unsuspend' | 'force_logout' | 'reset_2fa') => {
    if (selectedRows.size === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/superadmin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedRows),
          action,
        }),
      })
      if (res.ok) {
        setSelectedRows(new Set())
        fetchUsers(false)
      }
    } catch (err) {
      console.error('Erreur action groupée :', err)
    } finally {
      setBulkLoading(false)
    }
  }

  /* ── Export CSV ─────────────────────────────────────────────────────────── */

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams()
      params.set('format', 'csv')
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (planFilter !== 'all') params.set('plan', planFilter)

      const res = await fetch(`/api/superadmin/users/export?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Erreur export CSV :', err)
    }
  }

  /* ── Toggle Row Selection ───────────────────────────────────────────────── */

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedRows.size === users.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(users.map((u) => u.id)))
    }
  }

  /* ── Table Columns ──────────────────────────────────────────────────────── */

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={selectedRows.size === users.length && users.length > 0}
            onCheckedChange={toggleAll}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRows.has(row.original.id)}
            onCheckedChange={() => toggleRow(row.original.id)}
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Email
            {column.getIsSorted() === 'asc' ? <ChevronUp className="size-3" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="size-3" /> : null}
          </button>
        ),
        cell: ({ getValue }) => <span className="text-zinc-200">{getValue() as string}</span>,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Nom
            {column.getIsSorted() === 'asc' ? <ChevronUp className="size-3" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="size-3" /> : null}
          </button>
        ),
        cell: ({ getValue }) => <span className="text-zinc-300">{(getValue() as string) || '—'}</span>,
      },
      {
        accessorKey: 'role',
        header: 'Rôle',
        cell: ({ getValue }) => (
          <span className="text-zinc-400 text-xs">{(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ getValue }) => statusBadge(getValue() as string),
      },
      {
        accessorKey: 'plan',
        header: 'Plan',
        cell: ({ getValue }) => planBadge(getValue() as string),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Créé le
            {column.getIsSorted() === 'asc' ? <ChevronUp className="size-3" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="size-3" /> : null}
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="text-zinc-400 text-xs">
            {new Date(getValue() as string).toLocaleDateString('fr-FR')}
          </span>
        ),
      },
      {
        accessorKey: 'lastActivity',
        header: 'Dernière activité',
        cell: ({ getValue }) => (
          <span className="text-zinc-500 text-xs">
            {getValue() ? new Date(getValue() as string).toLocaleString('fr-FR') : '—'}
          </span>
        ),
      },
    ],
    [selectedRows, users.length],
  )

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <Input
                  placeholder="Rechercher par email ou nom..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-zinc-300">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-zinc-300">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">Tous les plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-emerald-400"
              >
                <Download className="mr-2 size-4" />
                Exporter CSV
              </Button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <AnimatePresence>
            {selectedRows.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3"
              >
                <span className="text-sm text-zinc-400">
                  {selectedRows.size} sélectionné{selectedRows.size > 1 ? 's' : ''}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('suspend')}
                  disabled={bulkLoading}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <ShieldBan className="mr-1 size-3" /> Suspendre
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('unsuspend')}
                  disabled={bulkLoading}
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <ShieldCheck className="mr-1 size-3" /> Réactiver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('force_logout')}
                  disabled={bulkLoading}
                  className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                >
                  <LogOut className="mr-1 size-3" /> Déconnexion forcée
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('reset_2fa')}
                  disabled={bulkLoading}
                  className="border-zinc-500/30 bg-zinc-500/10 text-zinc-300 hover:bg-zinc-500/20"
                >
                  <KeyRound className="mr-1 size-3" /> Réinitialiser 2FA
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-800 bg-zinc-900 shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">Aucun utilisateur trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-zinc-800 hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-zinc-500">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const isExpanded = expandedRow === row.original.id
                  return (
                    <tbody key={row.id}>
                      <TableRow
                        className="border-zinc-800 hover:bg-zinc-800/40 cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-200">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-700" align="end">
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-300 focus:bg-zinc-800"
                                onClick={(e) => { e.stopPropagation(); handleBulkAction('suspend') }}
                              >
                                <ShieldBan className="mr-2 size-3" /> Suspendre
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-emerald-400 focus:text-emerald-300 focus:bg-zinc-800"
                                onClick={(e) => { e.stopPropagation(); handleBulkAction('unsuspend') }}
                              >
                                <ShieldCheck className="mr-2 size-3" /> Réactiver
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-zinc-300 focus:bg-zinc-800"
                                onClick={(e) => { e.stopPropagation(); handleBulkAction('reset_2fa') }}
                              >
                                <KeyRound className="mr-2 size-3" /> Réinitialiser 2FA
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Row Detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, maxHeight: 0 }}
                            animate={{ opacity: 1, maxHeight: 300 }}
                            exit={{ opacity: 0, maxHeight: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-zinc-800"
                          >
                            <td colSpan={columns.length + 1} className="bg-zinc-950 p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-zinc-500">ID :</span>
                                  <p className="text-zinc-300 font-mono text-xs mt-1">{row.original.id}</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Email :</span>
                                  <p className="text-zinc-300 mt-1">{row.original.email}</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Rôle :</span>
                                  <p className="text-zinc-300 mt-1">{row.original.role}</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Créé le :</span>
                                  <p className="text-zinc-300 mt-1">
                                    {new Date(row.original.createdAt).toLocaleString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchUsers(true)}
            disabled={loadingMore}
            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400"
          >
            {loadingMore ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Charger plus
          </Button>
        </div>
      )}
    </div>
  )
}
