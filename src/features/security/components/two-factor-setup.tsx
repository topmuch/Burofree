'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, ShieldCheck, QrCode, Key, Copy, Download,
  Check, AlertTriangle, Loader2, ArrowRight, ArrowLeft
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwoFactorSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SetupStep = 'intro' | 'qr-code' | 'verify' | 'backup-codes' | 'complete'

interface SetupData {
  qrCode: string
  backupCodes: string[]
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS: { key: SetupStep; label: string; num: number }[] = [
  { key: 'intro', label: 'Introduction', num: 1 },
  { key: 'qr-code', label: 'QR Code', num: 2 },
  { key: 'verify', label: 'Vérification', num: 3 },
  { key: 'backup-codes', label: 'Codes de secours', num: 4 },
  { key: 'complete', label: 'Terminé', num: 5 },
]

function StepIndicator({ currentStep }: { currentStep: SetupStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-1.5 mb-4">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1.5">
          <div
            className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
              ${i < currentIndex ? 'bg-emerald-500 text-white' : ''}
              ${i === currentIndex ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50' : ''}
              ${i > currentIndex ? 'bg-secondary text-muted-foreground' : ''}
            `}
          >
            {i < currentIndex ? <Check className="w-3.5 h-3.5" /> : step.num}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 rounded-full transition-colors duration-300 ${
              i < currentIndex ? 'bg-emerald-500' : 'bg-secondary'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TwoFactorSetup({ open, onOpenChange }: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('intro')
  const [direction, setDirection] = useState(1)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [totpToken, setTotpToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [codesCopied, setCodesCopied] = useState(false)

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setStep('intro')
      setSetupData(null)
      setTotpToken('')
      setLoading(false)
      setCodesCopied(false)
      setDirection(1)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  const goToStep = useCallback((newStep: SetupStep) => {
    const currentIndex = STEPS.findIndex(s => s.key === step)
    const newIndex = STEPS.findIndex(s => s.key === newStep)
    setDirection(newIndex > currentIndex ? 1 : -1)
    setStep(newStep)
  }, [step])

  // ─── Setup: Call API to get QR code + backup codes ──────────────────────
  const handleSetup = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/security/2fa/setup', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la configuration.')
        return
      }

      setSetupData({ qrCode: data.qrCode, backupCodes: data.backupCodes })
      goToStep('qr-code')
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [goToStep])

  // ─── Enable: Verify TOTP token and enable 2FA ──────────────────────────
  const handleEnable = useCallback(async () => {
    if (totpToken.length !== 6) {
      toast.error('Veuillez entrer un code à 6 chiffres.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/security/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpToken }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Code invalide. Veuillez réessayer.')
        setTotpToken('')
        return
      }

      toast.success('2FA activée avec succès !')
      goToStep('backup-codes')
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [totpToken, goToStep])

  // ─── Copy backup codes to clipboard ─────────────────────────────────────
  const handleCopyCodes = useCallback(async () => {
    if (!setupData?.backupCodes) return
    try {
      await navigator.clipboard.writeText(setupData.backupCodes.join('\n'))
      setCodesCopied(true)
      toast.success('Codes copiés dans le presse-papiers')
      setTimeout(() => setCodesCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier les codes')
    }
  }, [setupData])

  // ─── Download backup codes as text file ─────────────────────────────────
  const handleDownloadCodes = useCallback(() => {
    if (!setupData?.backupCodes) return
    const content = [
      'Maellis — Codes de secours 2FA',
      '================================',
      'Conservez ces codes en lieu sûr.',
      'Chaque code ne peut être utilisé qu\'une seule fois.',
      '',
      ...setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Généré le : ${new Date().toLocaleString('fr-FR')}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'maellis-2fa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Codes téléchargés')
  }, [setupData])

  // ─── Step Content Renderers ─────────────────────────────────────────────

  const renderIntro = () => (
    <div className="space-y-5">
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center"
        >
          <Shield className="w-10 h-10 text-emerald-400" />
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Authentification à deux facteurs</h3>
        <p className="text-sm text-muted-foreground">
          Ajoutez une couche de sécurité supplémentaire à votre compte.
        </p>
      </div>

      <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Protection renforcée</p>
            <p className="text-xs text-muted-foreground">
              Même si votre mot de passe est compromis, votre compte reste protégé.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <QrCode className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Application authentificateur</p>
            <p className="text-xs text-muted-foreground">
              Utilisez Google Authenticator, Authy ou toute app compatible TOTP.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Codes de secours</p>
            <p className="text-xs text-muted-foreground">
              Des codes de sauvegarde en cas de perte de votre appareil.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300">
          Assurez-vous d&apos;avoir une application authentificateur installée avant de continuer.
        </p>
      </div>
    </div>
  )

  const renderQrCode = () => (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Scanner le QR Code</h3>
        <p className="text-sm text-muted-foreground">
          Scannez ce code avec votre application authentificateur.
        </p>
      </div>

      {setupData?.qrCode && (
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="p-3 bg-white rounded-xl"
          >
            <img
              src={setupData.qrCode}
              alt="QR Code pour configuration 2FA"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </motion.div>
        </div>
      )}

      <Separator />

      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <QrCode className="w-4 h-4 text-emerald-400" />
          <p className="text-xs font-medium">Instructions</p>
        </div>
        <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
          <li>Ouvrez votre application authentificateur</li>
          <li>Appuyez sur le bouton &quot;+&quot; ou &quot;Ajouter un compte&quot;</li>
          <li>Scannez le QR code ci-dessus</li>
          <li>Un code à 6 chiffres apparaîtra dans l&apos;application</li>
        </ol>
      </div>
    </div>
  )

  const renderVerify = () => (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Vérifier le code</h3>
        <p className="text-sm text-muted-foreground">
          Entrez le code à 6 chiffres affiché dans votre application authentificateur.
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={totpToken}
          onChange={setTotpToken}
          onComplete={() => {}}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="w-11 h-12 text-lg" />
            <InputOTPSlot index={1} className="w-11 h-12 text-lg" />
            <InputOTPSlot index={2} className="w-11 h-12 text-lg" />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} className="w-11 h-12 text-lg" />
            <InputOTPSlot index={4} className="w-11 h-12 text-lg" />
            <InputOTPSlot index={5} className="w-11 h-12 text-lg" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Le code change toutes les 30 secondes. Si celui-ci expire, attendez le prochain.
      </p>
    </div>
  )

  const renderBackupCodes = () => (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Codes de secours</h3>
        <p className="text-sm text-muted-foreground">
          Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu&apos;une seule fois.
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300">
          Si vous perdez l&apos;accès à votre application authentificateur, ces codes seront votre seul moyen de connexion.
        </p>
      </div>

      {setupData?.backupCodes && (
        <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-secondary/50 border border-border">
          {setupData.backupCodes.map((code, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-background/50 text-sm font-mono"
            >
              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
              <span>{code}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          onClick={handleCopyCodes}
        >
          {codesCopied ? (
            <><Check className="w-3.5 h-3.5 mr-1.5" /> Copié</>
          ) : (
            <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copier</>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          onClick={handleDownloadCodes}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Télécharger
        </Button>
      </div>
    </div>
  )

  const renderComplete = () => (
    <div className="space-y-5">
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center"
        >
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-emerald-400">2FA activée !</h3>
        <p className="text-sm text-muted-foreground">
          Votre compte est maintenant protégé par l&apos;authentification à deux facteurs.
        </p>
      </div>

      <div className="space-y-2 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <p className="text-sm">Connexion sécurisée par TOTP</p>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <p className="text-sm">Codes de secours générés</p>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <p className="text-sm">Sessions existantes invalidées</p>
        </div>
      </div>
    </div>
  )

  // ─── Step content map ───────────────────────────────────────────────────
  const stepContent: Record<SetupStep, () => React.ReactNode> = {
    'intro': renderIntro,
    'qr-code': renderQrCode,
    'verify': renderVerify,
    'backup-codes': renderBackupCodes,
    'complete': renderComplete,
  }

  // ─── Footer buttons ─────────────────────────────────────────────────────
  const renderFooter = () => {
    switch (step) {
      case 'intro':
        return (
          <Button
            onClick={handleSetup}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Configuration...</>
            ) : (
              <>Commencer la configuration <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        )

      case 'qr-code':
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => goToStep('intro')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <Button
              onClick={() => goToStep('verify')}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Continuer <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )

      case 'verify':
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => goToStep('qr-code')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <Button
              onClick={handleEnable}
              disabled={loading || totpToken.length !== 6}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification...</>
              ) : (
                <>Vérifier & activer <ShieldCheck className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        )

      case 'backup-codes':
        return (
          <Button
            onClick={() => goToStep('complete')}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            J&apos;ai sauvegardé mes codes <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )

      case 'complete':
        return (
          <Button
            onClick={() => handleOpenChange(false)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Terminé
          </Button>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Configuration 2FA
          </DialogTitle>
          <DialogDescription>
            Sécurisez votre compte avec l&apos;authentification à deux facteurs
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {stepContent[step]()}
          </motion.div>
        </AnimatePresence>

        <Separator />

        {renderFooter()}
      </DialogContent>
    </Dialog>
  )
}
