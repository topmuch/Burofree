'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, User, Palette, Bell, Globe, Bot, Moon, Sun,
  Mail, Plus, Download, RotateCcw, Shield, LogIn
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
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
  const { user, focusMode, setFocusMode, emailAccounts, setAuthModalOpen } = useAppStore()

  const [name, setName] = useState(user?.name || 'Alex Martin')
  const [profession, setProfession] = useState(user?.profession || 'Développeur Web')
  const [timezone, setTimezone] = useState(user?.timezone || 'Europe/Paris')
  const [assistantName, setAssistantName] = useState(user?.assistantName || 'Maellis')
  const [assistantTone, setAssistantTone] = useState(user?.assistantTone || 'professionnel')
  const [darkMode, setDarkMode] = useState(true)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [accountProvider, setAccountProvider] = useState('gmail')
  const [accountEmail, setAccountEmail] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')

  const userEmail = user?.email || 'alex@exemple.fr'

  const handleSaveProfile = () => {
    toast.success('Profil sauvegardé')
  }

  const handleSaveAssistant = () => {
    toast.success('Paramètres de l\'assistant sauvegardés')
  }

  const handleExportData = () => {
    toast.info('Fonctionnalité à venir')
  }

  const handleResetData = () => {
    toast.success('Données réinitialisées')
  }

  const handleAddAccount = () => {
    if (!accountEmail.trim()) {
      toast.error('L\'email est requis')
      return
    }
    toast.success('Compte ajouté')
    setAddAccountOpen(false)
    setAccountEmail('')
    setImapHost('')
    setImapPort('993')
  }

  const providerBadgeClass: Record<string, string> = {
    gmail: 'bg-red-500/20 text-red-400',
    outlook: 'bg-amber-500/20 text-amber-400',
    imap: 'bg-zinc-500/20 text-zinc-400',
  }

  const providerLabels: Record<string, string> = {
    gmail: 'Gmail',
    outlook: 'Outlook',
    imap: 'IMAP',
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

      {/* 4. Comptes Email */}
      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Mail className="w-4 h-4 text-emerald-400" />
                Comptes Email
              </CardTitle>
              <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un compte
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajouter un compte email</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Fournisseur</Label>
                      <Select value={accountProvider} onValueChange={setAccountProvider}>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                          <SelectItem value="imap">IMAP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        placeholder="votre@email.com"
                        className="bg-secondary"
                      />
                    </div>
                    {accountProvider === 'imap' && (
                      <>
                        <div className="space-y-2">
                          <Label>Hôte IMAP</Label>
                          <Input
                            value={imapHost}
                            onChange={(e) => setImapHost(e.target.value)}
                            placeholder="imap.example.com"
                            className="bg-secondary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input
                            value={imapPort}
                            onChange={(e) => setImapPort(e.target.value)}
                            placeholder="993"
                            className="bg-secondary"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddAccountOpen(false)}>Annuler</Button>
                    <Button onClick={handleAddAccount} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                      Ajouter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {emailAccounts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun compte email connecté</p>
                <p className="text-xs mt-1">Ajoutez un compte pour recevoir vos emails</p>
              </div>
            ) : (
              <div className="space-y-2">
                {emailAccounts.map(account => (
                  <div key={account.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Badge className={cn('text-xs', providerBadgeClass[account.provider] || providerBadgeClass.imap)}>
                      {providerLabels[account.provider] || account.provider}
                    </Badge>
                    <span className="text-sm">{account.email}</span>
                    {account.isPrimary && (
                      <Badge variant="outline" className="text-[10px] h-4 ml-auto border-emerald-500/30 text-emerald-400">
                        Principal
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 5. Données */}
      <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4 text-emerald-400" />
              Données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Exporter mes données</p>
                <p className="text-xs text-muted-foreground">Télécharger une copie de toutes vos données</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Exporter
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-400">Réinitialiser les données</p>
                <p className="text-xs text-muted-foreground">Supprimer toutes vos données de l&apos;application</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Réinitialiser
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes vos données seront supprimées, y compris les tâches,
                      projets, factures, documents et paramètres.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetData}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Réinitialiser
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
