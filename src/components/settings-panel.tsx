'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, User, Palette, Bot, Moon, Sun,
  Download, RotateCcw, Shield, LogIn,
  Mail, Server, CheckCircle2, XCircle, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { ConnectedAccounts } from '@/components/connected-accounts'
import { TagsSection } from '@/components/tags-panel'
import { AutomationsSection } from '@/components/automations-panel'
import { TwoFactorStatusCard } from '@/features/security/components/two-factor-status'
import { GdprPanel } from '@/features/security/components/gdpr-panel'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const timezones = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Amsterdam',
  'Europe/Rome',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Toronto',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const tonePreviewMessages: Record<string, string> = {
  professionnel: 'Bonjour ! Je suis Maellis, votre assistant professionnel. Comment puis-je vous aider aujourd\'hui ?',
  amical: 'Salut ! C\'est Maellis, votre assistant. Qu\'est-ce que je peux faire pour vous aujourd\'hui ? 😊',
  minimaliste: 'Maellis. En quoi puis-je aider ?',
}

export function SettingsPanel() {
  const { user, focusMode, setFocusMode, setAuthModalOpen } = useAppStore()

  const [name, setName] = useState(user?.name || 'Alex Martin')
  const [profession, setProfession] = useState(user?.profession || 'Développeur Web')
  const [timezone, setTimezone] = useState(user?.timezone || 'Europe/Paris')
  const [assistantName, setAssistantName] = useState(user?.assistantName || 'Maellis')
  const [assistantTone, setAssistantTone] = useState(user?.assistantTone || 'professionnel')
  const [darkMode, setDarkMode] = useState(true)

  const userEmail = user?.email || 'alex@exemple.fr'

  // ─── SMTP State ────────────────────────────────────────────────────────
  const [smtpLoading, setSmtpLoading] = useState(true)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpConfigured, setSmtpConfigured] = useState(false)
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFromName, setSmtpFromName] = useState('Maellis')
  const [smtpFromEmail, setSmtpFromEmail] = useState('')
  const [smtpReplyTo, setSmtpReplyTo] = useState('')
  const [smtpProvider, setSmtpProvider] = useState('custom')

  // Load SMTP config on mount
  useEffect(() => {
    async function loadSmtp() {
      try {
        const res = await fetch('/api/email/config')
        if (res.ok) {
          const data = await res.json()
          setSmtpConfigured(data.configured)
          setSmtpEnabled(data.enabled)
          if (data.configured) {
            setSmtpHost(data.host || '')
            setSmtpPort(String(data.port || '587'))
            setSmtpSecure(data.secure || false)
            setSmtpUser(data.user || '')
            setSmtpFromName(data.fromName || 'Maellis')
            setSmtpFromEmail(data.fromEmail || '')
            setSmtpReplyTo(data.replyTo || '')
          }
        }
      } catch {
        // Silently fail — config may not be available
      } finally {
        setSmtpLoading(false)
      }
    }
    loadSmtp()
  }, [])

  const smtpProviders: Record<string, { host: string; port: string; secure: boolean; label: string }> = {
    gmail: { host: 'smtp.gmail.com', port: '587', secure: false, label: 'Gmail' },
    outlook: { host: 'smtp.office365.com', port: '587', secure: false, label: 'Outlook / Office 365' },
    ovh: { host: 'ssl0.ovh.net', port: '465', secure: true, label: 'OVH' },
    sendgrid: { host: 'smtp.sendgrid.net', port: '587', secure: false, label: 'SendGrid' },
    scaleway: { host: 'smtp.scaleway.com', port: '587', secure: false, label: 'Scaleway' },
    custom: { host: '', port: '587', secure: false, label: 'Personnalisé' },
  }

  const handleProviderChange = (provider: string) => {
    setSmtpProvider(provider)
    const preset = smtpProviders[provider]
    if (preset && provider !== 'custom') {
      setSmtpHost(preset.host)
      setSmtpPort(preset.port)
      setSmtpSecure(preset.secure)
    }
  }

  const handleSaveSmtp = async () => {
    setSmtpSaving(true)
    try {
      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: smtpSecure,
          user: smtpUser,
          pass: smtpPass,
          fromName: smtpFromName,
          fromEmail: smtpFromEmail,
          replyTo: smtpReplyTo || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSmtpConfigured(true)
        setSmtpEnabled(true)
        toast.success('Configuration SMTP sauvegardée')
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSmtpSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    if (!smtpFromEmail && !userEmail) {
      toast.error('Adresse email requise pour le test')
      return
    }
    setSmtpTesting(true)
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Email de test envoyé avec succès')
      } else {
        toast.error(data.error || data.details || 'Échec du test SMTP')
      }
    } catch {
      toast.error('Échec du test SMTP')
    } finally {
      setSmtpTesting(false)
    }
  }

  const handleDisableSmtp = async () => {
    try {
      const res = await fetch('/api/email/config', { method: 'DELETE' })
      if (res.ok) {
        setSmtpEnabled(false)
        toast.success('Notifications SMTP désactivées')
      } else {
        toast.error('Erreur lors de la désactivation')
      }
    } catch {
      toast.error('Erreur lors de la désactivation')
    }
  }

  const handleSaveProfile = () => {
    toast.success('Profil sauvegardé')
  }

  const handleSaveAssistant = () => {
    toast.success('Paramètres de l\'assistant sauvegardés')
  }

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/gdpr/export')
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `maellis-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Données exportées avec succès')
      } else {
        toast.error('Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleResetData = () => {
    toast.success('Données réinitialisées')
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    }),
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Settings className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold">Paramètres</h2>
      </div>

      {/* 1. Profil */}
      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4 text-emerald-400" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nom</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={userEmail}
                  readOnly
                  className="bg-secondary opacity-70 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Profession</Label>
                <Input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fuseau horaire</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSaveProfile}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              size="sm"
            >
              Sauvegarder
            </Button>
            <Button
              onClick={() => setAuthModalOpen(true)}
              variant="outline"
              size="sm"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Assistant IA */}
      <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Bot className="w-4 h-4 text-emerald-400" />
              Assistant IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nom de l&apos;assistant</Label>
                <Input
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ton</Label>
                <Select value={assistantTone} onValueChange={setAssistantTone}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                    <SelectItem value="amical">Amical</SelectItem>
                    <SelectItem value="minimaliste">Minimaliste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Preview */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Aperçu :</p>
              <p className="text-sm">
                {tonePreviewMessages[assistantTone] || tonePreviewMessages.professionnel}
              </p>
            </div>
            <Button
              onClick={handleSaveAssistant}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              size="sm"
            >
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. Apparence */}
      <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Palette className="w-4 h-4 text-emerald-400" />
              Apparence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="w-4 h-4 text-amber-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
                <div>
                  <p className="text-sm">Thème</p>
                  <p className="text-xs text-muted-foreground">
                    {darkMode ? 'Mode sombre activé' : 'Mode clair activé'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs', !darkMode && 'text-muted-foreground')}>Clair</span>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className={cn('text-xs', darkMode && 'text-muted-foreground')}>Sombre</span>
              </div>
            </div>

            <Separator />

            {/* Focus Mode */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Mode Focus</p>
                <p className="text-xs text-muted-foreground">Réduire les distractions et se concentrer</p>
              </div>
              <Switch
                checked={focusMode}
                onCheckedChange={setFocusMode}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Comptes connectés */}
      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-6">
            <ConnectedAccounts />
          </CardContent>
        </Card>
      </motion.div>

      {/* 5. Configuration SMTP */}
      <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-emerald-400" />
              Configuration SMTP
              {smtpLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />
              ) : smtpConfigured && smtpEnabled ? (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Configuré
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Non configuré
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider Preset */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fournisseur</Label>
              <Select value={smtpProvider} onValueChange={handleProviderChange}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                  <SelectItem value="ovh">OVH</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="scaleway">Scaleway</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Host & Port */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Server className="w-3 h-3" />
                  Hôte SMTP
                </Label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Port</Label>
                <Select value={smtpPort} onValueChange={setSmtpPort}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="587">587 (STARTTLS)</SelectItem>
                    <SelectItem value="465">465 (SSL/TLS)</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="2525">2525</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Secure Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Connexion sécurisée
                </p>
                <p className="text-xs text-muted-foreground">
                  {smtpSecure ? 'SSL/TLS (port 465)' : 'STARTTLS (port 587)'}
                </p>
              </div>
              <Switch
                checked={smtpSecure}
                onCheckedChange={setSmtpSecure}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            <Separator />

            {/* Username & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nom d&apos;utilisateur</Label>
                <Input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="user@example.com"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Mot de passe
                  {smtpConfigured && !smtpPass && (
                    <span className="ml-1 text-muted-foreground/60">(défini)</span>
                  )}
                </Label>
                <Input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={smtpConfigured ? '••••••••' : 'Mot de passe'}
                  className="bg-secondary"
                />
              </div>
            </div>

            <Separator />

            {/* From Name & From Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nom expéditeur</Label>
                <Input
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  placeholder="Maellis"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email expéditeur</Label>
                <Input
                  type="email"
                  value={smtpFromEmail}
                  onChange={(e) => setSmtpFromEmail(e.target.value)}
                  placeholder="noreply@example.com"
                  className="bg-secondary"
                />
              </div>
            </div>

            {/* Reply-To */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Répondre à <span className="text-muted-foreground/60">(optionnel)</span>
              </Label>
              <Input
                type="email"
                value={smtpReplyTo}
                onChange={(e) => setSmtpReplyTo(e.target.value)}
                placeholder="support@example.com"
                className="bg-secondary"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                onClick={handleSaveSmtp}
                disabled={smtpSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                size="sm"
              >
                {smtpSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Sauvegarde…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Sauvegarder
                  </>
                )}
              </Button>

              <Button
                onClick={handleTestSmtp}
                disabled={smtpTesting || !smtpConfigured}
                variant="outline"
                size="sm"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                {smtpTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Test en cours…
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Envoyer un test
                  </>
                )}
              </Button>

              {smtpConfigured && smtpEnabled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Désactiver
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Désactiver les notifications SMTP ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Les emails ne seront plus envoyés. La configuration sera conservée et pourra être réactivée.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisableSmtp}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Désactiver
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 6. Tags & Labels */}
      <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-6">
            <TagsSection />
          </CardContent>
        </Card>
      </motion.div>

      {/* 7. Rappels & Automatisations */}
      <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-6">
            <AutomationsSection />
          </CardContent>
        </Card>
      </motion.div>

      {/* 8. Sécurité 2FA */}
      <motion.div custom={7} variants={sectionVariants} initial="hidden" animate="visible">
        <TwoFactorStatusCard />
      </motion.div>

      {/* 9. Données & RGPD */}
      <motion.div custom={8} variants={sectionVariants} initial="hidden" animate="visible">
        <GdprPanel />
      </motion.div>
    </div>
  )
}
