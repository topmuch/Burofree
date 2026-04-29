'use client'

/**
 * GDPR Panel — Data management panel for the settings page
 *
 * Sections:
 *  1. Consent Management — toggle switches for each consent type with current state
 *  2. Data Export — button to export all data, shows last export date
 *  3. Account Deletion — warning card with request/confirm/cancel flow
 *  4. DPO Contact — form to contact Data Protection Officer
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Download, Trash2, AlertTriangle, Check, X, Cookie,
  Loader2, Calendar, Clock, RefreshCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DpoContactForm } from './dpo-contact-form'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────

interface ConsentPreferences {
  essential: boolean
  analytics: boolean
  functional: boolean
  marketing: boolean
}

interface DeletionSchedule {
  id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'executed'
  gracePeriodEnd: string
  createdAt: string
}

interface LastExport {
  date: string | null
  loading: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────

const CONSENT_DESCRIPTIONS: Record<keyof ConsentPreferences, { label: string; description: string; icon: typeof Cookie }> = {
  essential: {
    label: 'Essentiels',
    description: 'Nécessaires au fonctionnement du site. Toujours actifs.',
    icon: Shield,
  },
  analytics: {
    label: 'Analytique',
    description: 'Statistiques d\'utilisation et performances.',
    icon: Cookie,
  },
  functional: {
    label: 'Fonctionnels',
    description: 'Fonctionnalités améliorées et personnalisation.',
    icon: Cookie,
  },
  marketing: {
    label: 'Marketing',
    description: 'Publicités ciblées et suivi marketing.',
    icon: Cookie,
  },
}

const DELETION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed: { label: 'Confirmée', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  cancelled: { label: 'Annulée', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  executed: { label: 'Exécutée', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

// ─── Component ────────────────────────────────────────────────────────────

export function GdprPanel() {
  // ─── Consent State ────────────────────────────────────────────────
  const [consents, setConsents] = useState<ConsentPreferences>({
    essential: true,
    analytics: false,
    functional: false,
    marketing: false,
  })
  const [consentsLoading, setConsentsLoading] = useState(true)
  const [consentSaving, setConsentSaving] = useState<string | null>(null)

  // ─── Export State ─────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const [lastExport, setLastExport] = useState<LastExport>({ date: null, loading: false })

  // ─── Deletion State ───────────────────────────────────────────────
  const [deletionSchedule, setDeletionSchedule] = useState<DeletionSchedule | null>(null)
  const [deletionLoading, setDeletionLoading] = useState(true)
  const [requestingDeletion, setRequestingDeletion] = useState(false)
  const [confirmingDeletion, setConfirmingDeletion] = useState(false)
  const [cancellingDeletion, setCancellingDeletion] = useState(false)

  // ─── Animation variants ───────────────────────────────────────────
  const sectionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.3 },
    }),
  }

  // ─── Fetch consent preferences ────────────────────────────────────
  const fetchConsents = useCallback(async () => {
    try {
      const res = await fetch('/api/consent')
      if (res.ok) {
        const data = await res.json()
        setConsents(data.consents)
      }
    } catch {
      // Use defaults
    } finally {
      setConsentsLoading(false)
    }
  }, [])

  // ─── Fetch deletion schedule ──────────────────────────────────────
  const fetchDeletionSchedule = useCallback(async () => {
    try {
      // We need to check if there's a pending deletion.
      // The API doesn't have a direct "get my schedule" endpoint for users,
      // but we can infer it from the GDPR request status.
      // For now, we'll use a simple approach — try the gdpr/delete route info.
      // Actually, we can check the existing schedule via the gdpr service.
      // Since there's no GET endpoint for the schedule, we'll track it from
      // the POST/DELETE responses.
      setDeletionSchedule(null)
    } catch {
      // Ignore
    } finally {
      setDeletionLoading(false)
    }
  }, [])

  // ─── Initial data load ────────────────────────────────────────────
  useEffect(() => {
    fetchConsents()
    fetchDeletionSchedule()
  }, [fetchConsents, fetchDeletionSchedule])

  // ─── Handle consent toggle ────────────────────────────────────────
  const handleConsentToggle = useCallback(async (key: keyof ConsentPreferences) => {
    if (key === 'essential') return

    const newValue = !consents[key]
    setConsentSaving(key)

    // Optimistic update
    setConsents(prev => ({ ...prev, [key]: newValue }))

    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consents: {
            analytics: key === 'analytics' ? newValue : consents.analytics,
            functional: key === 'functional' ? newValue : consents.functional,
            marketing: key === 'marketing' ? newValue : consents.marketing,
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setConsents(data.consents)
        toast.success(`Cookies ${CONSENT_DESCRIPTIONS[key].label.toLowerCase()} ${newValue ? 'activés' : 'désactivés'}`)
      } else {
        // Rollback
        setConsents(prev => ({ ...prev, [key]: !newValue }))
        toast.error('Erreur lors de la mise à jour des préférences')
      }
    } catch {
      // Rollback
      setConsents(prev => ({ ...prev, [key]: !newValue }))
      toast.error('Erreur réseau')
    } finally {
      setConsentSaving(null)
    }
  }, [consents])

  // ─── Handle data export ───────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/gdpr/export')
      if (res.ok) {
        const data = await res.json()
        // Create downloadable JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `burozen-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setLastExport({ date: new Date().toISOString(), loading: false })
        toast.success('Données exportées avec succès')
      } else if (res.status === 429) {
        toast.error('Limite d\'export atteinte. Un export par jour maximum.')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur réseau lors de l\'export')
    } finally {
      setExporting(false)
    }
  }, [])

  // ─── Handle deletion request ──────────────────────────────────────
  const handleRequestDeletion = useCallback(async () => {
    setRequestingDeletion(true)
    try {
      const res = await fetch('/api/gdpr/delete', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setDeletionSchedule({
          id: data.scheduleId,
          status: 'pending',
          gracePeriodEnd: data.gracePeriodEnd,
          createdAt: new Date().toISOString(),
        })
        toast.success('Demande de suppression créée. Veuillez confirmer pour finaliser.')
      } else if (res.status === 409) {
        toast.error(data.error || 'Une demande est déjà en cours')
      } else {
        toast.error(data.error || 'Erreur lors de la demande')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setRequestingDeletion(false)
    }
  }, [])

  // ─── Handle deletion confirmation ─────────────────────────────────
  const handleConfirmDeletion = useCallback(async () => {
    setConfirmingDeletion(true)
    try {
      const res = await fetch('/api/gdpr/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      })
      const data = await res.json()

      if (res.ok) {
        setDeletionSchedule(prev => prev ? { ...prev, status: 'confirmed' } : null)
        toast.success('Suppression confirmée. Vos données seront anonymisées après la période de grâce.')
      } else {
        toast.error(data.error || 'Erreur lors de la confirmation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setConfirmingDeletion(false)
    }
  }, [])

  // ─── Handle deletion cancellation ─────────────────────────────────
  const handleCancelDeletion = useCallback(async () => {
    setCancellingDeletion(true)
    try {
      const res = await fetch('/api/gdpr/cancel', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setDeletionSchedule(null)
        toast.success('Demande de suppression annulée. Votre compte a été restauré.')
      } else {
        toast.error(data.error || 'Erreur lors de l\'annulation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setCancellingDeletion(false)
    }
  }, [])

  // ─── Format date helper ───────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Confidentialité & RGPD</h2>
          <p className="text-xs text-muted-foreground">Gérez vos consentements, données et droits RGPD</p>
        </div>
      </div>

      {/* ─── 1. Consent Management ──────────────────────────────── */}
      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Cookie className="w-4 h-4 text-emerald-400" />
              Gestion des consentements
            </CardTitle>
            <CardDescription className="text-xs">
              Contrôlez quels cookies et suivis sont autorisés sur votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {consentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 bg-secondary rounded" />
                      <div className="h-2.5 w-48 bg-secondary rounded" />
                    </div>
                    <div className="h-5 w-9 bg-secondary rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              (Object.keys(CONSENT_DESCRIPTIONS) as Array<keyof ConsentPreferences>).map((key) => {
                const { label, description, icon: Icon } = CONSENT_DESCRIPTIONS[key]
                const isEssential = key === 'essential'
                const isSaving = consentSaving === key
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                        consents[key]
                          ? 'bg-emerald-500/10'
                          : 'bg-zinc-500/10'
                      }`}>
                        <Icon className={`w-4 h-4 ${consents[key] ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{label}</p>
                          {isEssential && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                              Requis
                            </Badge>
                          )}
                          {consents[key] && !isEssential && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                              Actif
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                      <Switch
                        checked={consents[key]}
                        onCheckedChange={() => handleConsentToggle(key)}
                        disabled={isEssential || isSaving}
                        className="data-[state=checked]:bg-emerald-500"
                        aria-label={`${label} cookies`}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 2. Data Export ─────────────────────────────────────── */}
      <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4 text-emerald-400" />
              Export de données
            </CardTitle>
            <CardDescription className="text-xs">
              Téléchargez une copie de toutes vos données (Art. 15 & 20 RGPD)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Download className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm">Exporter mes données</p>
                  <p className="text-xs text-muted-foreground">
                    Format JSON — toutes vos données personnelles, projets, tâches, factures...
                  </p>
                  {lastExport.date && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Dernier export : {formatDate(lastExport.date)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                )}
                Exporter
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Limité à 1 export par jour. Le fichier contient toutes vos données personnelles — conservez-le en lieu sûr.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 3. Account Deletion ────────────────────────────────── */}
      <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-400">
              <Trash2 className="w-4 h-4" />
              Suppression du compte
            </CardTitle>
            <CardDescription className="text-xs">
              Demandez la suppression de votre compte et de vos données (Art. 17 RGPD)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deletionLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-3 w-48 bg-secondary rounded" />
                <div className="h-9 w-32 bg-secondary rounded" />
              </div>
            ) : deletionSchedule ? (
              /* ── Active Deletion Schedule ── */
              <div className="space-y-4">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Statut :</span>
                  <Badge
                    variant="outline"
                    className={DELETION_STATUS_MAP[deletionSchedule.status]?.color || ''}
                  >
                    {DELETION_STATUS_MAP[deletionSchedule.status]?.label || deletionSchedule.status}
                  </Badge>
                </div>

                {/* Grace period info */}
                {(deletionSchedule.status === 'pending' || deletionSchedule.status === 'confirmed') && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-red-400">
                          {deletionSchedule.status === 'pending'
                            ? 'Demande en attente de confirmation'
                            : 'Suppression confirmée'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Vos données seront anonymisées après le{' '}
                          <span className="text-foreground font-medium">
                            {formatDate(deletionSchedule.gracePeriodEnd)}
                          </span>{' '}
                          (période de grâce de 30 jours).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions based on status */}
                <div className="flex items-center gap-2">
                  {deletionSchedule.status === 'pending' && (
                    <>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs"
                            disabled={confirmingDeletion}
                          >
                            {confirmingDeletion ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Confirmer la suppression
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              Confirmer la suppression définitive ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Après la période de grâce (30 jours),
                              toutes vos données seront anonymisées : projets, tâches, factures,
                              documents, emails et paramètres. Vous ne pourrez plus vous connecter.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleConfirmDeletion}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Oui, confirmer la suppression
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            disabled={cancellingDeletion}
                          >
                            {cancellingDeletion ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Annuler la demande
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Annuler la demande de suppression ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Votre compte sera restauré et votre email récupérera son état d&apos;origine.
                              Vous pourrez continuer à utiliser Burozen normalement.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Retour</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleCancelDeletion}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                              Oui, annuler la suppression
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}

                  {deletionSchedule.status === 'confirmed' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          disabled={cancellingDeletion}
                        >
                          {cancellingDeletion ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Annuler pendant la période de grâce
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Annuler la suppression ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Il vous reste du temps avant la fin de la période de grâce.
                            Votre compte sera restauré et votre email récupérera son état d&apos;origine.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Retour</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelDeletion}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            Oui, annuler la suppression
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ) : (
              /* ── No Active Deletion Schedule ── */
              <>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-red-400">Zone à risque</p>
                      <p className="text-[11px] text-muted-foreground">
                        La suppression de votre compte est irréversible. Après une période de grâce
                        de 30 jours, toutes vos données seront anonymisées définitivement. Vous
                        pourrez annuler tant que la période de grâce n&apos;est pas écoulée.
                      </p>
                    </div>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                      disabled={requestingDeletion}
                    >
                      {requestingDeletion ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Demander la suppression
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Demander la suppression du compte ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Votre email sera anonymisé immédiatement (vous ne pourrez plus vous connecter).
                        Vous aurez ensuite 30 jours pour confirmer ou annuler cette demande.
                        Tant que la suppression n&apos;est pas confirmée, vous pouvez annuler à tout moment.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRequestDeletion}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Oui, demander la suppression
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 4. DPO Contact ─────────────────────────────────────── */}
      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
        <DpoContactForm />
      </motion.div>
    </div>
  )
}
