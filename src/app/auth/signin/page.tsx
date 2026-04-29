'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const isGoogleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED
const isAzureConfigured = !!process.env.NEXT_PUBLIC_AZURE_CONFIGURED

export default function SignInPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Veuillez entrer votre email')
      return
    }

    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password: password || undefined,
        mode: isRegister ? 'register' : 'login',
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        router.push('/app')
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl: '/app' })
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Back to home */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          {/* Center content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="text-3xl font-bold text-white">B</span>
              </div>
              <h1 className="text-4xl font-bold text-white">
                Bienvenue sur <span className="text-emerald-400">Burozen</span>
              </h1>
              <p className="text-lg text-zinc-400 max-w-md leading-relaxed">
                Votre copilote freelance intelligent. Gérez vos tâches, emails, factures et calendrier en un seul endroit.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {[
                { label: 'Gestion des tâches', desc: 'Organisez et suivez vos projets' },
                { label: 'Facturation', desc: 'Créez et relancez automatiquement' },
                { label: 'Emails intégrés', desc: 'Gmail & Outlook synchronisés' },
                { label: 'Assistant IA', desc: 'Automatisez votre workflow' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800"
                >
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Burozen — Tous droits réservés
          </p>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors lg:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Buro<span className="text-emerald-500">zen</span>
            </span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {isRegister ? 'Créer un compte' : 'Connexion'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRegister
                ? 'Commencez gratuitement avec Burozen'
                : 'Connectez-vous pour accéder à votre espace'}
            </p>
          </div>

          {/* OAuth Buttons */}
          {(isGoogleConfigured || isAzureConfigured) && (
            <div className="space-y-3">
              {isGoogleConfigured && (
                <Button
                  variant="outline"
                  className="w-full h-11 gap-3 text-sm font-medium"
                  onClick={() => handleOAuthSignIn('google')}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuer avec Google
                </Button>
              )}

              {isAzureConfigured && (
                <Button
                  variant="outline"
                  className="w-full h-11 gap-3 text-sm font-medium"
                  onClick={() => handleOAuthSignIn('azure-ad')}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M21.17 2H7.83C6.82 2 6 2.82 6 3.83v4.34l9 3.17 9-3.17V3.83C24 2.82 23.18 2 22.17 2h-1zM6 9v4l9 3 9-3V9l-9 3-9-3zM6 14v6.17C6 21.18 6.82 22 7.83 22h13.34c1.01 0 1.83-.82 1.83-1.83V14l-9 3-9-3z" fill="#0078D4"/>
                    <path d="M0 5.83v12.34C0 19.18.82 20 1.83 20H4V2H1.83C.82 2 0 2.82 0 3.83v2z" fill="#0364B8"/>
                  </svg>
                  Continuer avec Microsoft
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    ou avec votre email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isRegister ? 'Minimum 6 caractères' : 'Votre mot de passe'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn('h-11 pl-10 pr-10', !isRegister && 'pr-10')}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Créer mon compte' : 'Se connecter'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle register/login */}
          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                setError(null)
              }}
              className="font-semibold text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              {isRegister ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>

          {/* Legal */}
          <p className="text-xs text-center text-muted-foreground">
            En continuant, vous acceptez nos{' '}
            <Link href="/legal/cgv" className="underline hover:text-foreground transition-colors">
              CGV
            </Link>{' '}
            et notre{' '}
            <Link href="/legal/privacy" className="underline hover:text-foreground transition-colors">
              politique de confidentialité
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  )
}
