'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, ShieldCheck, ShieldAlert, Key, Loader2,
  RotateCcw, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { toast } from 'sonner'
import { TwoFactorSetup } from './two-factor-setup'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwoFactorStatus {
  enabled: boolean
  enabledAt?: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TwoFactorStatusCard() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupOpen, setSetupOpen] = useState(false)

  // Disable 2FA state
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableToken, setDisableToken] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)

  // Regenerate backup codes state
  const [regenDialogOpen, setRegenDialogOpen] = useState(false)
  const [regenToken, setRegenToken] = useState('')
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenCodes, setRegenCodes] = useState<string[] | null>(null)
  const [codesCopied, setCodesCopied] = useState(false)

  // ─── Fetch 2FA status ─────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const user = await res.json()
        setStatus({
          enabled: user.twoFactorEnabled ?? false,
          enabledAt: user.twoFactorEnabled ? user.updatedAt : undefined,
        })
      }
    } catch {
      // Silently fail — status will remain null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // ─── Disable 2FA ──────────────────────────────────────────────────────
  const handleDisable = useCallback(async () => {
    if (disableToken.length !== 6) {
      toast.error('Veuillez entrer un code à 6 chiffres.')
      return
    }

    setDisableLoading(true)
    try {
      const res = await fetch('/api/security/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableToken }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la désactivation.')
        setDisableToken('')
        return
      }

      toast.success('2FA désactivée')
      setDisableDialogOpen(false)
      setDisableToken('')
      fetchStatus()
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setDisableLoading(false)
    }
  }, [disableToken, fetchStatus])

  // ─── Regenerate Backup Codes ──────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (regenToken.length !== 6) {
      toast.error('Veuillez entrer votre code TOTP.')
      return
    }

    setRegenLoading(true)
    try {
      const res = await fetch('/api/security/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: regenToken }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la régénération.')
        setRegenToken('')
        return
      }

      setRegenCodes(data.backupCodes)
      setRegenToken('')
      toast.success('Nouveaux codes de secours générés')
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setRegenLoading(false)
    }
  }, [regenToken])

  // ─── Copy codes to clipboard ──────────────────────────────────────────
  const handleCopyCodes = useCallback(async () => {
    if (!regenCodes) return
    try {
      await navigator.clipboard.writeText(regenCodes.join('\n'))
      setCodesCopied(true)
      toast.success('Codes copiés dans le presse-papiers')
      setTimeout(() => setCodesCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier les codes')
    }
  }, [regenCodes])

  // ─── Download codes ───────────────────────────────────────────────────
  const handleDownloadCodes = useCallback(() => {
    if (!regenCodes) return
    const content = [
      'Burozen — Nouveaux codes de secours 2FA',
      '==========================================',
      'Conservez ces codes en lieu sûr.',
      'Chaque code ne peut être utilisé qu\'une seule fois.',
      '',
      ...regenCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Généré le : ${new Date().toLocaleString('fr-FR')}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'burozen-2fa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Codes téléchargés')
  }, [regenCodes])

  // ─── Loading skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-emerald-400" />
            Sécurité 2FA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── 2FA Disabled ─────────────────────────────────────────────────────
  if (!status?.enabled) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Sécurité 2FA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">2FA non activé</p>
                    <p className="text-xs text-muted-foreground">
                      Votre compte n&apos;est pas protégé par l&apos;authentification à deux facteurs
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
                  Non protégé
                </Badge>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  Sans 2FA, un mot de passe compromis suffit pour accéder à votre compte.
                </p>
              </div>

              <Button
                onClick={() => setSetupOpen(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Activer 2FA
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <TwoFactorSetup
          open={setupOpen}
          onOpenChange={(open) => {
            setSetupOpen(open)
            if (!open) fetchStatus()
          }}
        />
      </>
    )
  }

  // ─── 2FA Enabled ──────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Sécurité 2FA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">2FA activé</p>
                  <p className="text-xs text-muted-foreground">
                    {status.enabledAt
                      ? `Activé le ${new Date(status.enabledAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}`
                      : 'Votre compte est protégé par l\'authentification à deux facteurs'}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 border">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Protégé
              </Badge>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {/* Regenerate backup codes */}
              <AlertDialog open={regenDialogOpen} onOpenChange={(open) => {
                setRegenDialogOpen(open)
                if (!open) {
                  setRegenToken('')
                  setRegenCodes(null)
                  setCodesCopied(false)
                }
              }}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 justify-start"
                  >
                    <Key className="w-3.5 h-3.5 mr-2" />
                    Régénérer les codes de secours
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-emerald-400" />
                      Régénérer les codes de secours
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Entrez votre code TOTP actuel pour générer de nouveaux codes de secours.
                      Les anciens codes seront invalidés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {regenCodes ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-emerald-400">Nouveaux codes de secours :</p>
                      <div className="grid grid-cols-2 gap-1.5 p-3 rounded-lg bg-secondary/50 border border-border">
                        {regenCodes.map((code, i) => (
                          <div key={i} className="px-2 py-1 rounded bg-background/50 text-sm font-mono">
                            {code}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={handleCopyCodes}
                        >
                          {codesCopied ? '✓ Copié' : 'Copier'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={handleDownloadCodes}
                        >
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={regenToken}
                          onChange={setRegenToken}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="w-10 h-11 text-base" />
                            <InputOTPSlot index={1} className="w-10 h-11 text-base" />
                            <InputOTPSlot index={2} className="w-10 h-11 text-base" />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} className="w-10 h-11 text-base" />
                            <InputOTPSlot index={4} className="w-10 h-11 text-base" />
                            <InputOTPSlot index={5} className="w-10 h-11 text-base" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>
                  )}

                  <AlertDialogFooter>
                    {regenCodes ? (
                      <AlertDialogAction className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        Terminé
                      </AlertDialogAction>
                    ) : (
                      <>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault()
                            handleRegenerate()
                          }}
                          disabled={regenLoading || regenToken.length !== 6}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          {regenLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Génération...</>
                          ) : (
                            <><RotateCcw className="w-4 h-4 mr-2" /> Régénérer</>
                          )}
                        </AlertDialogAction>
                      </>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Disable 2FA */}
              <AlertDialog open={disableDialogOpen} onOpenChange={(open) => {
                setDisableDialogOpen(open)
                if (!open) setDisableToken('')
              }}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 justify-start"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-2" />
                    Désactiver 2FA
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-400">
                      <ShieldAlert className="w-5 h-5" />
                      Désactiver l&apos;authentification à deux facteurs
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action réduira la sécurité de votre compte. Vous devrez entrer un code TOTP
                      ou un code de secours pour confirmer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="flex justify-center py-2">
                    <InputOTP
                      maxLength={6}
                      value={disableToken}
                      onChange={setDisableToken}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-10 h-11 text-base" />
                        <InputOTPSlot index={1} className="w-10 h-11 text-base" />
                        <InputOTPSlot index={2} className="w-10 h-11 text-base" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="w-10 h-11 text-base" />
                        <InputOTPSlot index={4} className="w-10 h-11 text-base" />
                        <InputOTPSlot index={5} className="w-10 h-11 text-base" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDisable()
                      }}
                      disabled={disableLoading || disableToken.length !== 6}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {disableLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Désactivation...</>
                      ) : (
                        'Désactiver 2FA'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <TwoFactorSetup
        open={setupOpen}
        onOpenChange={(open) => {
          setSetupOpen(open)
          if (!open) fetchStatus()
        }}
      />
    </>
  )
}
