/**
 * ProductionPanel — Central UI for all PRIORITÉ 4 features
 *
 * Tabs: Abonnement, Équipe, Export/Import, Sauvegardes, Monitoring
 */

'use client'

import { useState, Fragment } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, Users, Download, Database, Activity,
  Plus, Mail, Shield, Check, AlertTriangle, Clock,
  HardDrive, Trash2, RefreshCw, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { usePWA } from '@/features/production/pwa/use-pwa'
import { PLANS } from '@/features/production/stripe/subscription-manager'
import { getRoleInfo } from '@/features/production/teams/permissions'

// ─── Subscription Tab ────────────────────────────────────────────────────────

function SubscriptionTab() {
  const { user } = useAppStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [stripeConfig, setStripeConfig] = useState<{
    configured: boolean
    currentPlan: { id: string; name: string; amount: number; features: string[] }
    subscription: Record<string, unknown> | null
    plans: Array<{ id: string; name: string; amount: number; currency: string; features: string[]; maxMembers: number }>
  } | null>(null)

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/stripe/config')
      if (res.ok) setStripeConfig(await res.json())
    } catch { /* ignore */ }
  }

  useState(() => { fetchConfig() })

  const handleSubscribe = async (planId: 'pro' | 'enterprise') => {
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, trialDays: 14 }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) window.open(data.url, '_blank')
      }
    } catch { /* ignore */ }
    setLoading(null)
  }

  const handlePortal = async () => {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.url) window.open(data.url, '_blank')
      }
    } catch { /* ignore */ }
    setLoading(null)
  }

  const currentPlan = stripeConfig?.currentPlan || PLANS[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Abonnement</h3>
          <p className="text-sm text-zinc-400">Gérez votre plan et votre facturation</p>
        </div>
        {stripeConfig?.configured && stripeConfig?.subscription && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePortal}
            disabled={loading === 'portal'}
            className="border-zinc-700 text-zinc-300 hover:text-zinc-100"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Portail Stripe
          </Button>
        )}
      </div>

      {/* Current plan */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Plan actuel</p>
              <p className="text-xl font-bold text-emerald-400">{currentPlan.name}</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              {(currentPlan.amount / 100).toFixed(2)} EUR/mois
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`bg-zinc-900/50 border-zinc-800 ${
              currentPlan.id === plan.id ? 'ring-2 ring-emerald-500/50' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-zinc-100">{plan.name}</CardTitle>
              <div className="text-2xl font-bold text-emerald-400">
                {plan.amount === 0 ? 'Gratuit' : `${(plan.amount / 100).toFixed(2)} EUR`}
                {plan.amount > 0 && <span className="text-sm text-zinc-400 font-normal">/mois</span>}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1 mb-4">
                {plan.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              {currentPlan.id !== plan.id && plan.amount > 0 && stripeConfig?.configured && (
                <Button
                  size="sm"
                  onClick={() => handleSubscribe(plan.id as 'pro' | 'enterprise')}
                  disabled={loading === plan.id}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading === plan.id ? 'Chargement...' : plan.amount > 0 ? 'S\'abonner (14j essai)' : 'Plan actuel'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Team Tab ────────────────────────────────────────────────────────────────

function TeamTab() {
  const { user } = useAppStore()
  const [teams, setTeams] = useState<Array<Record<string, unknown>>>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamSlug, setTeamSlug] = useState('')

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
      }
    } catch { /* ignore */ }
  }

  useState(() => { fetchTeams() })

  const handleCreateTeam = async () => {
    if (!teamName || !teamSlug) return
    setLoading(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, slug: teamSlug }),
      })
      if (res.ok) {
        setShowCreate(false)
        setTeamName('')
        setTeamSlug('')
        fetchTeams()
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleInvite = async (teamId: string) => {
    if (!inviteEmail) return
    setLoading(true)
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, email: inviteEmail, role: inviteRole }),
      })
      if (res.ok) setInviteEmail('')
    } catch { /* ignore */ }
    setLoading(false)
  }

  const roleInfo = getRoleInfo()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Équipe & Permissions</h3>
          <p className="text-sm text-zinc-400">Collaborez avec votre équipe en toute sécurité</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Créer une équipe
        </Button>
      </div>

      {/* Create team form */}
      {showCreate && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Nom de l'équipe"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            <Input
              placeholder="Slug (ex: mon-equipe)"
              value={teamSlug}
              onChange={(e) => setTeamSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            <Button
              size="sm"
              onClick={handleCreateTeam}
              disabled={loading || !teamName || !teamSlug}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Créer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">Aucune équipe. Créez-en une pour commencer à collaborer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {teams.map((team: Record<string, unknown>) => (
            <Card key={team.id as string} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-zinc-100">{team.name as string}</p>
                    <p className="text-xs text-zinc-400">/{team.slug as string}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                      {(team.myRole as string) || 'member'}
                    </Badge>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                      {String(team.memberCount || 0)} membre{(team.memberCount as number) > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Invite form */}
                {(team.myRole === 'owner' || team.myRole === 'admin') && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
                    <Input
                      placeholder="Email à inviter"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 text-xs h-8"
                    />
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="w-28 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membre</SelectItem>
                        <SelectItem value="viewer">Observateur</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleInvite(team.id as string)}
                      disabled={loading || !inviteEmail}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Inviter
                    </Button>
                  </div>
                )}

                {/* Members */}
                {Array.isArray(team.members) && team.members.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">Membres</p>
                    <div className="space-y-1">
                      {(team.members as Array<Record<string, unknown>>).slice(0, 5).map((m: Record<string, unknown>) => (
                        <div key={m.id as string} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300">
                            {String((m.user as Record<string, unknown>)?.name || (m.user as Record<string, unknown>)?.email || 'Invité')}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs border-zinc-700"
                            style={{ color: roleInfo[m.role as keyof typeof roleInfo]?.color || '#6b7280' }}
                          >
                            {roleInfo[m.role as keyof typeof roleInfo]?.label || String(m.role)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Permission matrix summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Matrice des permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div />
            <div className="text-center text-amber-400 font-medium">Propriétaire</div>
            <div className="text-center text-blue-400 font-medium">Admin</div>
            <div className="text-center text-emerald-400 font-medium">Membre</div>
            {['Créer projets', 'Inviter membres', 'Gérer facturation', 'Supprimer données', 'Voir rapports'].map((perm) => (
              <Fragment key={perm}>
                <div className="text-zinc-400">{perm}</div>
                <div className="text-center text-emerald-400"><Check className="h-3 w-3 mx-auto" /></div>
                <div className="text-center">{perm === 'Supprimer données' ? '—' : <Check className="h-3 w-3 mx-auto text-emerald-400" />}</div>
                <div className="text-center">{perm.includes('Inviter') || perm.includes('facturation') ? '—' : <Check className="h-3 w-3 mx-auto text-emerald-400" />}</div>
              </Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Export/Import Tab ────────────────────────────────────────────────────────

function ExportImportTab() {
  const [exportFormat, setExportFormat] = useState('csv')
  const [entityType, setEntityType] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: exportFormat, entityType }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `burofree_export.${exportFormat}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* ignore */ }
    setExporting(false)
  }

  const handleImport = async (previewOnly: boolean) => {
    if (!importData) return
    setImporting(true)
    try {
      const data = JSON.parse(importData)
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'json',
          entityType,
          data: Array.isArray(data) ? data : [data],
          previewOnly,
        }),
      })
      if (res.ok) setImportResult(await res.json())
    } catch (err) {
      setImportResult({ error: 'Données JSON invalides' })
    }
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-100">Export & Import</h3>

      {/* Export */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter vos données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="tasks">Tâches</SelectItem>
                <SelectItem value="invoices">Factures</SelectItem>
                <SelectItem value="projects">Projets</SelectItem>
                <SelectItem value="time_entries">Temps</SelectItem>
                <SelectItem value="contacts">Contacts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-28 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
            >
              {exporting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer des données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder='Collez vos données JSON ici, ex: [{"title": "Ma tâche", "status": "todo"}]'
            className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-md p-3 text-xs text-zinc-100 font-mono resize-y"
          />
          <div className="flex items-center gap-2">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tasks">Tâches</SelectItem>
                <SelectItem value="invoices">Factures</SelectItem>
                <SelectItem value="projects">Projets</SelectItem>
                <SelectItem value="time_entries">Temps</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImport(true)}
              disabled={importing || !importData}
              className="border-zinc-700 text-zinc-300 h-8 text-xs"
            >
              Prévisualiser
            </Button>
            <Button
              size="sm"
              onClick={() => handleImport(false)}
              disabled={importing || !importData}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
            >
              Importer
            </Button>
          </div>
          {importResult && (
            <div className={`p-3 rounded text-xs ${importResult.error ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {importResult.error
                ? String(importResult.error)
                : importResult.preview
                  ? `Aperçu: ${(importResult.preview as unknown[]).length} valides, ${importResult.duplicates || 0} doublons, ${(importResult.errors as unknown[])?.length || 0} erreurs`
                  : `Import: ${(importResult as { imported: number }).imported} créés, ${(importResult as { skipped: number }).skipped} ignorés, ${(importResult as { errors: number }).errors} erreurs`
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Backup Tab ───────────────────────────────────────────────────────────────

function BackupTab() {
  const [snapshots, setSnapshots] = useState<Array<Record<string, unknown>>>([])
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backup')
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || [])
        setHealth(data.health || null)
      }
    } catch { /* ignore */ }
  }

  useState(() => { fetchBackups() })

  const handleManualBackup = async () => {
    setLoading(true)
    try {
      await fetch('/api/backup', { method: 'POST' })
      fetchBackups()
    } catch { /* ignore */ }
    setLoading(false)
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Sauvegardes & Recovery</h3>
          <p className="text-sm text-zinc-400">Protection automatique de vos données</p>
        </div>
        <Button
          size="sm"
          onClick={handleManualBackup}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Database className="h-4 w-4 mr-1" />
          Sauvegarde manuelle
        </Button>
      </div>

      {/* Health overview */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-zinc-400">Dernière sauvegarde</p>
              <p className="text-sm font-medium text-zinc-100">
                {health.lastBackup
                  ? new Date(health.lastBackup as string).toLocaleDateString('fr-FR')
                  : 'Jamais'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-zinc-400">Snapshots</p>
              <p className="text-sm font-medium text-emerald-400">{String(health.totalSnapshots || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-zinc-400">Stockage total</p>
              <p className="text-sm font-medium text-zinc-100">{formatBytes(Number(health.totalSize) || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-zinc-400">Statut</p>
              <Badge variant="outline" className={`text-xs ${health.lastBackupStatus === 'completed' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
                {String(health.lastBackupStatus === 'completed' ? 'OK' : health.lastBackupStatus || 'N/A')}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Snapshots list */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Historique des sauvegardes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">Aucune sauvegarde disponible</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {snapshots.map((s: Record<string, unknown>) => (
                <div key={s.id as string} className="flex items-center justify-between py-2 px-3 rounded bg-zinc-800/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${
                      s.type === 'manual' ? 'border-blue-500/30 text-blue-400' :
                      s.type === 'daily' ? 'border-emerald-500/30 text-emerald-400' :
                      'border-zinc-600 text-zinc-400'
                    }`}>
                      {String(s.type)}
                    </Badge>
                    <span className="text-zinc-300">{new Date(s.startedAt as string).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">{formatBytes(Number(s.fileSize) || 0)}</span>
                    {s.encrypted ? <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">chiffré</Badge> : null}
                    <Badge variant="outline" className={`text-xs ${s.status === 'completed' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}`}>
                      {String(s.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Production Panel ────────────────────────────────────────────────────

export function ProductionPanel() {
  const { isOnline, queueCount } = usePWA()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* PWA Status bar */}
      <div className="flex items-center gap-3 text-xs">
        <Badge variant="outline" className={`border-zinc-700 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isOnline ? 'En ligne' : 'Hors-ligne'}
        </Badge>
        {queueCount > 0 && (
          <Badge variant="outline" className="border-amber-500/30 text-amber-400">
            {queueCount} action{queueCount > 1 ? 's' : ''} en attente
          </Badge>
        )}
      </div>

      <Tabs defaultValue="subscription" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 h-10">
          <TabsTrigger value="subscription" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <CreditCard className="h-3.5 w-3.5 mr-1" />
            Abonnement
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Users className="h-3.5 w-3.5 mr-1" />
            Équipe
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Download className="h-3.5 w-3.5 mr-1" />
            Export/Import
          </TabsTrigger>
          <TabsTrigger value="backup" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Database className="h-3.5 w-3.5 mr-1" />
            Sauvegardes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <SubscriptionTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="team">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <TeamTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="export">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ExportImportTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="backup">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <BackupTab />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Missing Upload icon
function Upload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
