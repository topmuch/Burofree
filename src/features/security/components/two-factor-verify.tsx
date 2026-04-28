'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Loader2, Key, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwoFactorVerifyProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type VerifyMode = 'totp' | 'backup'

// ─── Main Component ───────────────────────────────────────────────────────────

export function TwoFactorVerify({ open, onOpenChange, onSuccess }: TwoFactorVerifyProps) {
  const [mode, setMode] = useState<VerifyMode>('totp')
  const [totpToken, setTotpToken] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setMode('totp')
      setTotpToken('')
      setBackupCode('')
      setLoading(false)
      setError(null)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  const handleVerify = useCallback(async () => {
    const token = mode === 'totp' ? totpToken : backupCode.toUpperCase().trim()

    if (!token) {
      setError(mode === 'totp' ? 'Veuillez entrer le code à 6 chiffres.' : 'Veuillez entrer un code de secours.')
      return
    }

    if (mode === 'totp' && token.length !== 6) {
      setError('Le code TOTP doit contenir 6 chiffres.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur de vérification.')
        return
      }

      if (data.valid) {
        toast.success('Vérification réussie')
        onSuccess()
        handleOpenChange(false)
      } else {
        setError('Code invalide. Veuillez réessayer.')
        if (mode === 'totp') {
          setTotpToken('')
        } else {
          setBackupCode('')
        }
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [mode, totpToken, backupCode, onSuccess, handleOpenChange])

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'totp' ? 'backup' : 'totp')
    setError(null)
    setTotpToken('')
    setBackupCode('')
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Vérification 2FA
          </DialogTitle>
          <DialogDescription>
            Entrez le code de votre application authentificateur pour continuer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Shield Icon */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center"
            >
              <Shield className="w-8 h-8 text-emerald-400" />
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'totp' ? (
              <motion.div
                key="totp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-sm text-center text-muted-foreground">
                  Code à 6 chiffres de votre application authentificateur
                </p>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={totpToken}
                    onChange={setTotpToken}
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
              </motion.div>
            ) : (
              <motion.div
                key="backup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-sm text-center text-muted-foreground">
                  Entrez un de vos codes de secours (format XXXX-XXXX)
                </p>

                <div className="max-w-xs mx-auto">
                  <Input
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    className="text-center font-mono text-lg tracking-wider bg-secondary h-12"
                    maxLength={9}
                    autoComplete="off"
                  />
                </div>

                <div className="flex items-center gap-2 justify-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">
                    Chaque code de secours ne peut être utilisé qu&apos;une seule fois.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 text-center"
            >
              {error}
            </motion.p>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleVerify}
              disabled={loading || (mode === 'totp' ? totpToken.length !== 6 : !backupCode.trim())}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification...</>
              ) : (
                <>Vérifier <Shield className="w-4 h-4 ml-2" /></>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={toggleMode}
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              {mode === 'totp'
                ? 'Utiliser un code de secours'
                : 'Utiliser le code TOTP'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
