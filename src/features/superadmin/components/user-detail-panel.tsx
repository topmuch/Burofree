'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldBan,
  ShieldCheck,
  KeyRound,
  UserRound,
  Download,
  Trash2,
  ExternalLink,
  Activity,
  CreditCard,
  Mail,
  FileText,
  CheckSquare,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface UserDetail {
  id: string
  email: string
  name: string | null
  role: string
  status: 'active' | 'suspended'
  plan: string
  createdAt: string
  lastActivity: string | null
  twoFactorEnabled: boolean
  stripeCustomerId: string | null
  modules: Array<{ key: string; name: string; enabled: boolean }>
  stats: {
    tasks: number
    invoices: number
    emails: number
  }
  subscription: {
    status: string
    plan: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
  loginHistory: Array<{
    timestamp: string
    ip: string | null
    userAgent: string | null
    success: boolean
  }>
}

interface UserDetailPanelProps {
  userId: string | null
  open: boolean
  onClose: () => void
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function UserDetailPanel({ userId, open, onClose }: UserDetailPanelProps) {
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [impersonateReason, setImpersonateReason] = useState('')
  const [anonymizeConfirmEmail, setAnonymizeConfirmEmail] = useState('')
  const [anonymizeReason, setAnonymizeReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/users/${userId}`)
      if (res.ok) {
        const json = await res.json()
        setDetail(json)
      }
    } catch (err) {
      console.error('Erreur chargement détail utilisateur :', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (open && userId) {
      fetchDetail()
    } else {
      setDetail(null)
    }
  }, [open, userId, fetchDetail])

  /* ── Actions ────────────────────────────────────────────────────────────── */

  const handleAction = async (action: string, body: Record<string, unknown> = {}) => {
    if (!userId) return
    setActionLoading(action)
    try {
      const res = await fetch(`/api/superadmin/users/${userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })
      if (res.ok) {
        fetchDetail()
      }
    } catch (err) {
      console.error(`Erreur action ${action} :`, err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleImpersonate = async () => {
    if (!impersonateReason.trim()) return
    await handleAction('impersonate', { reason: impersonateReason })
    setImpersonateReason('')
  }

  const handleExportRGPD = async () => {
    if (!userId) return
    setActionLoading('export_rgpd')
    try {
      const res = await fetch(`/api/superadmin/users/${userId}/rgpd-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeInvoices: true,
          includeEmails: true,
          includeDocuments: true,
          includeTimeEntries: true,
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rgpd_${detail?.email || userId}_${new Date().toISOString().slice(0, 10)}.zip`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Erreur export RGPD :', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAnonymize = async () => {
    if (!anonymizeConfirmEmail || anonymizeConfirmEmail !== detail?.email) return
    await handleAction('anonymize', { reason: anonymizeReason, confirmEmail: anonymizeConfirmEmail })
    setAnonymizeConfirmEmail('')
    setAnonymizeReason('')
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="bg-zinc-950 border-zinc-800 w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-zinc-100">Détail utilisateur</SheetTitle>
          <SheetDescription className="text-zinc-500">
            Informations et actions d&apos;administration
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-emerald-500" />
          </div>
        ) : !detail ? (
          <div className="py-20 text-center text-zinc-500">Aucune donnée</div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 p-4"
          >
            {/* User Info */}
            <Card className="border-zinc-800 bg-zinc-900 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <UserRound className="size-5 text-emerald-400" />
                  {detail.name || 'Sans nom'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Email</span>
                  <span className="text-zinc-200">{detail.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Rôle</span>
                  <span className="text-zinc-300">{detail.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Statut</span>
                  {detail.status === 'active' ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" variant="outline">Actif</Badge>
                  ) : (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30" variant="outline">Suspendu</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">2FA</span>
                  <Badge
                    className={detail.twoFactorEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'}
                    variant="outline"
                  >
                    {detail.twoFactorEnabled ? 'Activé' : 'Désactivé'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Plan</span>
                  <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30" variant="outline">
                    {detail.plan.charAt(0).toUpperCase() + detail.plan.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Créé le</span>
                  <span className="text-zinc-300">{new Date(detail.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                {detail.stripeCustomerId && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Stripe</span>
                    <a
                      href={`https://dashboard.stripe.com/customers/${detail.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs"
                    >
                      Voir dans Stripe <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-zinc-800 bg-zinc-900 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-100 text-base">Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-zinc-800">
                    <CheckSquare className="size-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-zinc-100">{detail.stats.tasks}</p>
                    <p className="text-xs text-zinc-500">Tâches</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-zinc-800">
                    <FileText className="size-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-zinc-100">{detail.stats.invoices}</p>
                    <p className="text-xs text-zinc-500">Factures</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-zinc-800">
                    <Mail className="size-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-zinc-100">{detail.stats.emails}</p>
                    <p className="text-xs text-zinc-500">Emails</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription */}
            {detail.subscription && (
              <Card className="border-zinc-800 bg-zinc-900 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                    <CreditCard className="size-4 text-emerald-400" />
                    Abonnement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Statut</span>
                    <span className="text-zinc-200">{detail.subscription.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Plan</span>
                    <span className="text-zinc-300">{detail.subscription.plan}</span>
                  </div>
                  {detail.subscription.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Fin de période</span>
                      <span className="text-zinc-300">
                        {new Date(detail.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {detail.subscription.cancelAtPeriodEnd && (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30" variant="outline">
                      Annulation en fin de période
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Modules */}
            {detail.modules.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-zinc-100 text-base">Modules activés</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {detail.modules.map((mod) => (
                    <Badge
                      key={mod.key}
                      className={mod.enabled
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-700/50 text-zinc-500 border-zinc-600'}
                      variant="outline"
                    >
                      {mod.name}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="border-zinc-800 bg-zinc-900 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                  <Activity className="size-4 text-emerald-400" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Suspend / Unsuspend */}
                {detail.status === 'active' ? (
                  <Button
                    variant="outline"
                    className="w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 justify-start"
                    onClick={() => handleAction('suspend')}
                    disabled={actionLoading === 'suspend'}
                  >
                    {actionLoading === 'suspend' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldBan className="mr-2 size-4" />}
                    Suspendre l&apos;utilisateur
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 justify-start"
                    onClick={() => handleAction('unsuspend')}
                    disabled={actionLoading === 'unsuspend'}
                  >
                    {actionLoading === 'unsuspend' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
                    Réactiver l&apos;utilisateur
                  </Button>
                )}

                {/* Reset 2FA */}
                <Button
                  variant="outline"
                  className="w-full border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 justify-start"
                  onClick={() => handleAction('reset_2fa')}
                  disabled={actionLoading === 'reset_2fa'}
                >
                  {actionLoading === 'reset_2fa' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
                  Réinitialiser 2FA
                </Button>

                {/* Impersonate */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Raison de l'impersonation..."
                      value={impersonateReason}
                      onChange={(e) => setImpersonateReason(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 text-sm"
                    />
                    <Button
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 shrink-0"
                      onClick={handleImpersonate}
                      disabled={!impersonateReason.trim() || actionLoading === 'impersonate'}
                    >
                      {actionLoading === 'impersonate' ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">Impersonation (15 min max, avec journalisation)</p>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Export RGPD */}
                <Button
                  variant="outline"
                  className="w-full border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 justify-start"
                  onClick={handleExportRGPD}
                  disabled={actionLoading === 'export_rgpd'}
                >
                  {actionLoading === 'export_rgpd' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
                  Exporter données RGPD
                </Button>

                {/* Anonymize */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 justify-start"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Anonymiser l&apos;utilisateur
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-zinc-100">Confirmer l&apos;anonymisation</AlertDialogTitle>
                      <AlertDialogDescription className="text-zinc-400">
                        Cette action est irréversible. Toutes les données personnelles seront remplacées par des données anonymes.
                        Saisissez l&apos;email de l&apos;utilisateur pour confirmer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3">
                      <Input
                        placeholder={`Confirmez avec : ${detail.email}`}
                        value={anonymizeConfirmEmail}
                        onChange={(e) => setAnonymizeConfirmEmail(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200"
                      />
                      <Input
                        placeholder="Raison de l'anonymisation..."
                        value={anonymizeReason}
                        onChange={(e) => setAnonymizeReason(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300">Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleAnonymize}
                        disabled={anonymizeConfirmEmail !== detail.email || !anonymizeReason.trim()}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Anonymiser définitivement
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Login History */}
            {detail.loginHistory.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-zinc-100 text-base">Historique de connexion</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500 text-xs">Date</TableHead>
                        <TableHead className="text-zinc-500 text-xs">IP</TableHead>
                        <TableHead className="text-zinc-500 text-xs">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.loginHistory.map((entry, i) => (
                        <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-xs text-zinc-400">
                            {new Date(entry.timestamp).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 font-mono">
                            {entry.ip || '—'}
                          </TableCell>
                          <TableCell>
                            {entry.success ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" variant="outline">Réussi</Badge>
                            ) : (
                              <Badge className="bg-red-500/15 text-red-400 border-red-500/30" variant="outline">Échoué</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  )
}
