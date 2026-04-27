'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Mail, Lock, Sparkles, ExternalLink } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Google SVG icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// Microsoft SVG icon
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  )
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const googleConfigured = !!(process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED === 'true')
  const microsoftConfigured = !!(process.env.NEXT_PUBLIC_MICROSOFT_CONFIGURED === 'true')

  const handleGoogleSignIn = async () => {
    if (!googleConfigured) {
      // Demo mode - sign in with a demo Google account
      setLoading('google')
      try {
        const result = await signIn('credentials', {
          email: 'demo.google@burofree.dev',
          redirect: false,
        })
        if (result?.error) {
          setError('Erreur lors de la connexion')
        }
      } catch {
        setError('Erreur lors de la connexion')
      } finally {
        setLoading(null)
        onOpenChange(false)
      }
      return
    }
    setLoading('google')
    signIn('google', { callbackUrl: '/' })
  }

  const handleMicrosoftSignIn = async () => {
    if (!microsoftConfigured) {
      // Demo mode - sign in with a demo Microsoft account
      setLoading('microsoft')
      try {
        const result = await signIn('credentials', {
          email: 'demo.outlook@burofree.dev',
          redirect: false,
        })
        if (result?.error) {
          setError('Erreur lors de la connexion')
        }
      } catch {
        setError('Erreur lors de la connexion')
      } finally {
        setLoading(null)
        onOpenChange(false)
      }
      return
    }
    setLoading('microsoft')
    signIn('azure-ad', { callbackUrl: '/' })
  }

  const handleEmailSignIn = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir votre email')
      return
    }
    setLoading('email')
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        redirect: false,
      })
      if (result?.error) {
        setError('Erreur lors de la connexion')
      }
    } catch {
      setError('Erreur lors de la connexion')
    } finally {
      setLoading(null)
      onOpenChange(false)
    }
  }

  const handleDemoSignIn = async () => {
    setLoading('demo')
    try {
      const result = await signIn('credentials', {
        email: 'alex@freelance.dev',
        redirect: false,
      })
      if (result?.error) {
        setError('Erreur lors de la connexion démo')
      }
    } catch {
      setError('Erreur lors de la connexion démo')
    } finally {
      setLoading(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950" showCloseButton>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center"
            >
              <span className="text-2xl font-bold text-emerald-400">M</span>
            </motion.div>
          </div>
          <DialogTitle className="text-xl font-semibold text-zinc-100">
            Connexion à Burofree
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Votre copilote de travail intelligent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Google Button */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              variant="outline"
              className="w-full h-11 justify-start gap-3 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-200 relative"
              onClick={handleGoogleSignIn}
              disabled={loading !== null}
            >
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">
                Continuer avec Google
              </span>
              {!googleConfigured && (
                <Badge className="text-[10px] h-5 bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 shrink-0">
                  Démo
                </Badge>
              )}
            </Button>
          </motion.div>

          {/* Microsoft Button */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              variant="outline"
              className="w-full h-11 justify-start gap-3 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-200 relative"
              onClick={handleMicrosoftSignIn}
              disabled={loading !== null}
            >
              <MicrosoftIcon className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">
                Continuer avec Microsoft
              </span>
              {!microsoftConfigured && (
                <Badge className="text-[10px] h-5 bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 shrink-0">
                  Démo
                </Badge>
              )}
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="relative py-1">
            <Separator className="bg-zinc-800" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-3 text-xs text-zinc-500">
              ou
            </span>
          </div>

          {/* Email Input + Local Login */}
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSignIn()}
                className="pl-10 h-11 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                disabled={loading !== null}
              />
            </div>
            <Button
              onClick={handleEmailSignIn}
              disabled={loading !== null}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
            >
              {loading === 'email' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Connexion locale
                </>
              )}
            </Button>
          </div>

          {/* Demo Button */}
          <div className="pt-1">
            <Button
              variant="ghost"
              onClick={handleDemoSignIn}
              disabled={loading !== null}
              className="w-full h-10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"
            >
              {loading === 'demo' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full"
                />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Essayer la démo
                </>
              )}
            </Button>
          </div>
        </div>

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

        {/* Footer note */}
        <p className="text-[11px] text-zinc-600 text-center leading-relaxed mt-1">
          En vous connectant, vous acceptez nos{' '}
          <span className="text-zinc-500 underline underline-offset-2 cursor-pointer hover:text-zinc-400">
            conditions d&apos;utilisation
          </span>
        </p>
      </DialogContent>
    </Dialog>
  )
}
