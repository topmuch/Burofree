'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, User, Palette, Bot, Moon, Sun,
  Download, RotateCcw, Shield, LogIn
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

      {/* 5. Tags & Labels */}
      <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-6">
            <TagsSection />
          </CardContent>
        </Card>
      </motion.div>

      {/* 6. Rappels & Automatisations */}
      <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-6">
            <AutomationsSection />
          </CardContent>
        </Card>
      </motion.div>

      {/* 7. Sécurité 2FA */}
      <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible">
        <TwoFactorStatusCard />
      </motion.div>

      {/* 8. Données & RGPD */}
      <motion.div custom={7} variants={sectionVariants} initial="hidden" animate="visible">
        <GdprPanel />
      </motion.div>
    </div>
  )
}
