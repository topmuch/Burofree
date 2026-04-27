'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Globe, MessageSquare, Video, HardDrive, Github, BookOpen,
  Mic, Store, Search, Sparkles, Check, Clock, X, Loader2, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceModule {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  category: string
  price: number
  features: string
  sortOrder: number
  userStatus: string | null
  userExpiresAt: string | null
  userTrialEndsAt: string | null
}

// ─── Icon mapping ─────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  Eye, Globe, MessageSquare, Video, HardDrive, Github, BookOpen, Mic, Store,
}

// ─── Category labels ──────────────────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  all: 'Tous',
  productivity: 'Productivité',
  collaboration: 'Collaboration',
  integration: 'Intégrations',
  premium: 'Premium',
}

// ─── Status badge config ──────────────────────────────────────────────────────

function getStatusBadge(status: string | null, expiresAt: string | null) {
  switch (status) {
    case 'free':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Gratuit</Badge>
    case 'active':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Actif</Badge>
    case 'trial':
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
        <Clock className="w-3 h-3 mr-1" />Essai
      </Badge>
    case 'expired':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Expiré</Badge>
    case 'cancelled':
      return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30">Annulé</Badge>
    default:
      return null
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MarketplacePanel() {
  const [modules, setModules] = useState<MarketplaceModule[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  // Fetch modules
  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace')
      if (res.ok) {
        const data = await res.json()
        setModules(data.modules || [])
      }
    } catch (error) {
      console.error('Error fetching marketplace:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  // Subscribe / trial
  const handleSubscribe = async (moduleId: string, moduleName: string) => {
    setActionLoading(moduleId)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, action: 'trial' }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || `Essai gratuit activé pour ${moduleName}`)
        await fetchModules()
      } else {
        toast.error(data.error || 'Erreur lors de l\'abonnement')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(null)
    }
  }

  // Cancel subscription
  const handleCancel = async (moduleId: string, moduleName: string) => {
    setActionLoading(moduleId)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, action: 'cancel' }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || `Abonnement à ${moduleName} annulé`)
        await fetchModules()
      } else {
        toast.error(data.error || 'Erreur lors de l\'annulation')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(null)
    }
  }

  // Reactivate subscription
  const handleReactivate = async (moduleId: string, moduleName: string) => {
    setActionLoading(moduleId)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, action: 'reactivate' }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || `Abonnement à ${moduleName} réactivé`)
        await fetchModules()
      } else {
        toast.error(data.error || 'Erreur lors de la réactivation')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter modules
  const filteredModules = modules.filter(mod => {
    const matchesSearch = !searchQuery ||
      mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mod.description || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = activeCategory === 'all' || mod.category === activeCategory

    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(modules.map(m => m.category)))]

  // Free module slugs
  const freeSlugs = ['marketplace', 'focus-mode', 'voice-commands']

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-32 mt-3" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Marketplace</h2>
          <p className="text-sm text-zinc-400 mt-1">Extensions et modules pour personnaliser votre espace</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Rechercher un module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50"
          />
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            {categories.map(cat => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-zinc-400 text-xs"
              >
                {categoryLabels[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Module Grid */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucun module trouvé</p>
          {searchQuery && (
            <p className="text-xs mt-1">Essayez un autre terme de recherche</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredModules.map((mod, index) => {
              const IconComponent = iconMap[mod.icon || ''] || Store
              const isFree = freeSlugs.includes(mod.slug) || mod.price === 0
              const status = isFree ? 'free' : mod.userStatus

              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                          <IconComponent className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status, mod.userExpiresAt)}
                          {isFree ? null : (
                            <span className="text-xs text-zinc-500">
                              {mod.price > 0 ? `${mod.price}€/mois` : 'Gratuit'}
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-semibold text-zinc-100 mt-3">{mod.name}</h3>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {mod.description || 'Module pour améliorer votre productivité'}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 pb-3">
                      {/* Features */}
                      {(() => {
                        try {
                          const features = JSON.parse(mod.features) as string[]
                          if (features.length > 0) {
                            return (
                              <ul className="space-y-1.5">
                                {features.slice(0, 3).map((feature, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                                {features.length > 3 && (
                                  <li className="text-xs text-zinc-500">+{features.length - 3} autres</li>
                                )}
                              </ul>
                            )
                          }
                        } catch {
                          // ignore
                        }
                        return null
                      })()}
                    </CardContent>

                    <CardFooter className="pt-3 border-t border-zinc-800">
                      {isFree ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm text-zinc-400">Inclus gratuitement</span>
                          <Switch
                            checked={true}
                            disabled
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                      ) : status === 'active' ? (
                        <div className="flex items-center gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                            onClick={() => handleCancel(mod.id, mod.name)}
                            disabled={actionLoading === mod.id}
                          >
                            {actionLoading === mod.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-1" />
                            )}
                            Annuler
                          </Button>
                        </div>
                      ) : status === 'trial' ? (
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 text-xs text-amber-400">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Essai en cours
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                            onClick={() => handleCancel(mod.id, mod.name)}
                            disabled={actionLoading === mod.id}
                          >
                            {actionLoading === mod.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ) : status === 'cancelled' ? (
                        <div className="flex items-center gap-2 w-full">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                            onClick={() => handleReactivate(mod.id, mod.name)}
                            disabled={actionLoading === mod.id}
                          >
                            {actionLoading === mod.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-1" />
                            )}
                            Réactiver
                          </Button>
                        </div>
                      ) : status === 'expired' ? (
                        <div className="flex items-center gap-2 w-full">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                            onClick={() => handleSubscribe(mod.id, mod.name)}
                            disabled={actionLoading === mod.id}
                          >
                            {actionLoading === mod.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Nouvel essai
                          </Button>
                        </div>
                      ) : (
                        // Inactive / no subscription
                        <Button
                          size="sm"
                          className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                          onClick={() => handleSubscribe(mod.id, mod.name)}
                          disabled={actionLoading === mod.id}
                        >
                          {actionLoading === mod.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-1" />
                              Essai gratuit 7j
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
