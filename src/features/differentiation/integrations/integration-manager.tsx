'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Video, HardDrive, Github, BookOpen,
  Unplug, RefreshCw, Loader2, Check, AlertTriangle, X,
  ExternalLink, Shield
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntegrationConnection {
  id: string
  provider: string
  status: string
  health: { status: string; message: string }
  scopes: string | null
  metadata: string
  lastSyncAt: string | null
  lastError: string | null
  tokenExpiry: string | null
  createdAt: string
}

interface AvailableProvider {
  slug: string
  name: string
  icon: string
  connected: boolean
}

// ─── Icon mapping ─────────────────────────────────────────────────────────────

const providerIcons: Record<string, React.ElementType> = {
  slack: MessageSquare,
  zoom: Video,
  google_drive: HardDrive,
  github: Github,
  notion: BookOpen,
}

const providerDescriptions: Record<string, string> = {
  slack: 'Recevez vos notifications et communiquez avec votre équipe directement depuis Slack.',
  zoom: 'Créez et gérez vos réunions Zoom sans quitter Burozen.',
  google_drive: 'Accédez à vos fichiers Google Drive et partagez-les avec vos clients.',
  github: 'Synchronisez vos dépôts GitHub avec vos projets Burozen.',
  notion: 'Connectez vos espaces Notion pour une documentation unifiée.',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegrationManager() {
  const [connections, setConnections] = useState<IntegrationConnection[]>([])
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])
        setAvailableProviders(data.availableProviders || [])
      }
    } catch (error) {
      console.error('Error fetching integrations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  // Connect
  const handleConnect = async (providerSlug: string) => {
    setConnectingProvider(providerSlug)
    setActionLoading(providerSlug)

    try {
      // In production, this would redirect to OAuth flow
      // For demo, we simulate the OAuth callback with a mock code
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerSlug,
          code: `demo-oauth-code-${providerSlug}`,
          redirectUri: `${window.location.origin}/settings`,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || `${providerSlug} connecté avec succès`)
        setConnectDialogOpen(false)
        await fetchIntegrations()
      } else {
        toast.error(data.error || 'Erreur lors de la connexion')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(null)
      setConnectingProvider(null)
    }
  }

  // Disconnect
  const handleDisconnect = async (providerSlug: string) => {
    setActionLoading(providerSlug)
    try {
      const res = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerSlug }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || `Connexion à ${providerSlug} supprimée`)
        await fetchIntegrations()
      } else {
        toast.error(data.error || 'Erreur lors de la déconnexion')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(null)
    }
  }

  // Sync
  const handleSync = async (providerSlug: string) => {
    setActionLoading(`sync-${providerSlug}`)
    try {
      const res = await fetch(`/api/integrations/${providerSlug}/sync`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || `Synchronisation réussie`)
        await fetchIntegrations()
      } else {
        toast.error(data.error || 'Erreur de synchronisation')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(null)
    }
  }

  // Get status badge
  const getStatusBadge = (connection: IntegrationConnection) => {
    const healthStatus = connection.health?.status || connection.status
    switch (healthStatus) {
      case 'connected':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Connecté</Badge>
      case 'expired':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Expiré</Badge>
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Erreur</Badge>
      default:
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs">{connection.status}</Badge>
    }
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Intégrations</h2>
          <p className="text-sm text-zinc-400 mt-1">Connectez vos outils préférés à Burozen</p>
        </div>

        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30">
              <ExternalLink className="w-4 h-4 mr-1" />
              Connecter un service
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Connecter un service</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {availableProviders.filter(p => !p.connected).map(provider => {
                const Icon = providerIcons[provider.slug] || Shield
                return (
                  <button
                    key={provider.slug}
                    onClick={() => handleConnect(provider.slug)}
                    disabled={actionLoading === provider.slug}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-zinc-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-zinc-200">{provider.name}</p>
                      <p className="text-xs text-zinc-500 line-clamp-1">
                        {providerDescriptions[provider.slug]}
                      </p>
                    </div>
                    {actionLoading === provider.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium">Connecter</span>
                    )}
                  </button>
                )
              })}
              {availableProviders.filter(p => !p.connected).length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-6">Tous les services sont connectés</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {availableProviders.map((provider, index) => {
            const Icon = providerIcons[provider.slug] || Shield
            const connection = connections.find(c => c.provider === provider.slug)
            const isConnected = provider.connected && !!connection

            return (
              <motion.div
                key={provider.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-zinc-300" />
                      </div>
                      {connection && getStatusBadge(connection)}
                    </div>
                    <h3 className="font-semibold text-zinc-100 mt-3">{provider.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {providerDescriptions[provider.slug]}
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 pb-3">
                    {connection && (
                      <div className="space-y-2 text-xs text-zinc-500">
                        {connection.lastSyncAt && (
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3" />
                            <span>Dernière sync : {new Date(connection.lastSyncAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {connection.lastError && (
                          <div className="flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="line-clamp-1">{connection.lastError}</span>
                          </div>
                        )}
                        {connection.health?.message && connection.health.status === 'connected' && (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3 h-3" />
                            <span>{connection.health.message}</span>
                          </div>
                        )}
                        {/* Scopes */}
                        {connection.scopes && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(() => {
                              try {
                                const scopes = JSON.parse(connection.scopes) as string[]
                                return scopes.slice(0, 3).map(scope => (
                                  <Badge key={scope} className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0">
                                    {scope.split(':').pop()}
                                  </Badge>
                                ))
                              } catch {
                                return null
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-zinc-800">
                    {isConnected ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                          onClick={() => handleSync(provider.slug)}
                          disabled={actionLoading === `sync-${provider.slug}`}
                        >
                          {actionLoading === `sync-${provider.slug}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-1" />
                          )}
                          Synchroniser
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                          onClick={() => handleDisconnect(provider.slug)}
                          disabled={actionLoading === provider.slug}
                        >
                          {actionLoading === provider.slug ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unplug className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                        onClick={() => handleConnect(provider.slug)}
                        disabled={actionLoading === provider.slug}
                      >
                        {actionLoading === provider.slug ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-1" />
                        )}
                        Connecter
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
