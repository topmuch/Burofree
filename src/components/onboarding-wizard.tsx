'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, Check, Plus, X, Mail,
  Briefcase, Bot, FolderOpen, Clock, Bell, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TOTAL_STEPS = 7

interface OnboardingData {
  name: string
  profession: string
  assistantName: string
  assistantTone: 'professionnel' | 'amical' | 'minimaliste'
  projects: { name: string; client: string; budget: string }[]
  emailConnected: boolean
  notifications: { inApp: boolean; email: boolean }
  workHoursStart: string
  workHoursEnd: string
  workDays: number[]
}

const defaultData: OnboardingData = {
  name: '',
  profession: '',
  assistantName: 'Burofree',
  assistantTone: 'amical',
  projects: [],
  emailConnected: false,
  notifications: { inApp: true, email: false },
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  workDays: [1, 2, 3, 4, 5],
}

const toneConfig = {
  professionnel: {
    label: 'Professionnel',
    emoji: '💼',
    description: 'Ton formel et structuré',
    preview: 'Bonjour ! Je suis votre assistant professionnel. Comment puis-je vous aider aujourd\'hui ?',
    color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    selectedColor: 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/50',
  },
  amical: {
    label: 'Amical',
    emoji: '😊',
    description: 'Ton chaleureux et décontracté',
    preview: 'Salut ! C\'est super de vous avoir ici ! Qu\'est-ce que je peux faire pour vous aujourd\'hui ? 😊',
    color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    selectedColor: 'border-amber-500 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/50',
  },
  minimaliste: {
    label: 'Minimaliste',
    emoji: '✨',
    description: 'Ton concis et direct',
    preview: 'En quoi puis-je aider ?',
    color: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-400',
    selectedColor: 'border-zinc-400 bg-zinc-500/20 text-zinc-300 ring-2 ring-zinc-400/50',
  },
}

const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(defaultData)
  const [saving, setSaving] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const progress = (step / TOTAL_STEPS) * 100

  const updateData = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  const addProject = useCallback(() => {
    setData(prev => ({
      ...prev,
      projects: [...prev.projects, { name: '', client: '', budget: '' }]
    }))
  }, [])

  const removeProject = useCallback((index: number) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }))
  }, [])

  const updateProject = useCallback((index: number, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }))
  }, [])

  const toggleWorkDay = useCallback((day: number) => {
    setData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day].sort()
    }))
  }, [])

  const handleFinish = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setShowCelebration(true)
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 2: return data.name.trim().length > 0
      case 3: return data.assistantName.trim().length > 0
      default: return true
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const [direction, setDirection] = useState(0)

  const goNext = () => {
    setDirection(1)
    if (step < TOTAL_STEPS) setStep(step + 1)
  }

  const goPrev = () => {
    setDirection(-1)
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Étape {step}/{TOTAL_STEPS}</span>
            <span className="text-xs text-zinc-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800 [&>div]:bg-emerald-500" />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {step === 1 && <StepWelcome />}
            {step === 2 && <StepProfile data={data} updateData={updateData} />}
            {step === 3 && <StepAssistant data={data} updateData={updateData} />}
            {step === 4 && <StepProjects data={data} addProject={addProject} removeProject={removeProject} updateProject={updateProject} />}
            {step === 5 && <StepEmail data={data} updateData={updateData} />}
            {step === 6 && <StepPreferences data={data} updateData={updateData} toggleWorkDay={toggleWorkDay} />}
            {step === 7 && <StepDone data={data} showCelebration={showCelebration} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <Button
              variant="ghost"
              onClick={goPrev}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Précédent
            </Button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {step === 1 ? 'Commençons la configuration' : 'Suivant'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving || showCelebration}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {showCelebration ? (
                <>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check className="w-4 h-4 mr-1" />
                  </motion.span>
                  C&apos;est parti !
                </>
              ) : saving ? (
                'Sauvegarde...'
              ) : (
                <>
                  Accéder au dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Welcome ────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30"
      >
        <span className="text-4xl font-bold text-white">M</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-white">
          Bienvenue dans <span className="text-emerald-400">Burofree</span> !
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-zinc-400 text-lg"
      >
        Votre copilote de travail intelligent
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-center gap-6 pt-4"
      >
        {[
          { icon: Briefcase, label: 'Projets' },
          { icon: Bot, label: 'Assistant IA' },
          { icon: FolderOpen, label: 'Documents' },
          { icon: Clock, label: 'Temps' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.1 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] text-zinc-500">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Step 2: Profile ────────────────────────────────────────────────

function StepProfile({ data, updateData }: { data: OnboardingData; updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void }) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Briefcase className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Votre profil</h2>
        <p className="text-sm text-zinc-400 mt-1">Parlez-nous un peu de vous</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-zinc-300">Comment vous appelez-vous ?</Label>
          <Input
            value={data.name}
            onChange={(e) => updateData('name', e.target.value)}
            placeholder="Votre nom ou prénom"
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-zinc-300">Quelle est votre profession ?</Label>
          <Select value={data.profession} onValueChange={(v) => updateData('profession', v)}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue placeholder="Sélectionnez votre profession" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Développeur">Développeur</SelectItem>
              <SelectItem value="Designer">Designer</SelectItem>
              <SelectItem value="Coach">Coach</SelectItem>
              <SelectItem value="Consultant">Consultant</SelectItem>
              <SelectItem value="Rédacteur">Rédacteur</SelectItem>
              <SelectItem value="Photographe">Photographe</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Assistant ──────────────────────────────────────────────

function StepAssistant({ data, updateData }: { data: OnboardingData; updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void }) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Bot className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Votre assistant</h2>
        <p className="text-sm text-zinc-400 mt-1">Personnalisez votre copilote IA</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-zinc-300">Nom de votre assistant</Label>
          <Input
            value={data.assistantName}
            onChange={(e) => updateData('assistantName', e.target.value)}
            placeholder="Burofree"
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm text-zinc-300">Quel ton préférez-vous ?</Label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(toneConfig) as Array<keyof typeof toneConfig>).map((tone) => {
              const config = toneConfig[tone]
              const isSelected = data.assistantTone === tone
              return (
                <button
                  key={tone}
                  onClick={() => updateData('assistantTone', tone)}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all cursor-pointer',
                    isSelected ? config.selectedColor : config.color
                  )}
                >
                  <div className="text-2xl mb-1">{config.emoji}</div>
                  <div className="text-xs font-medium">{config.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-xs text-zinc-500 mb-2">Aperçu :</p>
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {toneConfig[data.assistantTone].preview}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Projects ───────────────────────────────────────────────

function StepProjects({
  data, addProject, removeProject, updateProject
}: {
  data: OnboardingData
  addProject: () => void
  removeProject: (index: number) => void
  updateProject: (index: number, field: string, value: string) => void
}) {
  const skipProjects = data.projects.length === 0

  return (
    <div className="space-y-6 py-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <FolderOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Vos projets</h2>
        <p className="text-sm text-zinc-400 mt-1">Avez-vous des projets en cours ?</p>
      </div>

      <div className="space-y-3">
        {data.projects.map((project, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Projet {index + 1}</span>
              <button
                onClick={() => removeProject(index)}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={project.name}
              onChange={(e) => updateProject(index, 'name', e.target.value)}
              placeholder="Nom du projet"
              className="bg-zinc-900/50 border-zinc-600 text-white placeholder:text-zinc-600 text-sm focus:border-emerald-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={project.client}
                onChange={(e) => updateProject(index, 'client', e.target.value)}
                placeholder="Client"
                className="bg-zinc-900/50 border-zinc-600 text-white placeholder:text-zinc-600 text-sm focus:border-emerald-500"
              />
              <Input
                value={project.budget}
                onChange={(e) => updateProject(index, 'budget', e.target.value)}
                placeholder="Budget (optionnel)"
                type="number"
                className="bg-zinc-900/50 border-zinc-600 text-white placeholder:text-zinc-600 text-sm focus:border-emerald-500"
              />
            </div>
          </motion.div>
        ))}

        <Button
          variant="outline"
          onClick={addProject}
          className="w-full border-dashed border-zinc-600 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5"
        >
          <Plus className="w-4 h-4 mr-1" /> Ajouter un projet
        </Button>

        {skipProjects && (
          <p className="text-xs text-center text-zinc-500 mt-2">
            Vous pourrez ajouter des projets plus tard
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Step 5: Email ──────────────────────────────────────────────────

function StepEmail({ data, updateData }: { data: OnboardingData; updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void }) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Connexion email</h2>
        <p className="text-sm text-zinc-400 mt-1">Connectez votre boîte email</p>
      </div>

      <div className="space-y-3">
        <Card className="bg-zinc-800/50 border-zinc-700 hover:border-emerald-500/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Google</p>
              <p className="text-xs text-zinc-500">Gmail, Google Workspace</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              Non configuré
            </span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800/50 border-zinc-700 hover:border-emerald-500/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M21.17 2H7.83C6.82 2 6 2.82 6 3.83v4.34l9 3.17 9-3.17V3.83C24 2.82 23.18 2 22.17 2h-1zM6 9v4l9 3 9-3V9l-9 3-9-3zM6 14v6.17C6 21.18 6.82 22 7.83 22h13.34c1.01 0 1.83-.82 1.83-1.83V14l-9 3-9-3z" fill="#0078D4"/>
                <path d="M0 5.83v12.34C0 19.18.82 20 1.83 20H4V2H1.83C.82 2 0 2.82 0 3.83v2z" fill="#0364B8"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Microsoft</p>
              <p className="text-xs text-zinc-500">Outlook, Office 365</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              Non configuré
            </span>
          </CardContent>
        </Card>
      </div>

      <button
        onClick={() => updateData('emailConnected', false)}
        className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
      >
        Configurer plus tard
      </button>
    </div>
  )
}

// ─── Step 6: Preferences ────────────────────────────────────────────

function StepPreferences({
  data, updateData, toggleWorkDay
}: {
  data: OnboardingData
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void
  toggleWorkDay: (day: number) => void
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Bell className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Vos préférences</h2>
        <p className="text-sm text-zinc-400 mt-1">Personnalisez votre expérience</p>
      </div>

      <div className="space-y-5">
        {/* Notifications */}
        <div className="space-y-3">
          <Label className="text-sm text-zinc-300 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" /> Notifications
          </Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div>
                <p className="text-sm text-white">In-app</p>
                <p className="text-xs text-zinc-500">Notifications dans l&apos;application</p>
              </div>
              <Checkbox
                checked={data.notifications.inApp}
                onCheckedChange={(checked) => updateData('notifications', { ...data.notifications, inApp: !!checked })}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div>
                <p className="text-sm text-white">Email</p>
                <p className="text-xs text-zinc-500">Recevoir les notifications par email</p>
              </div>
              <Checkbox
                checked={data.notifications.email}
                onCheckedChange={(checked) => updateData('notifications', { ...data.notifications, email: !!checked })}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Work hours */}
        <div className="space-y-3">
          <Label className="text-sm text-zinc-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" /> Heures de travail
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Début</span>
              <Input
                type="time"
                value={data.workHoursStart}
                onChange={(e) => updateData('workHoursStart', e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Fin</span>
              <Input
                type="time"
                value={data.workHoursEnd}
                onChange={(e) => updateData('workHoursEnd', e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Work days */}
        <div className="space-y-3">
          <Label className="text-sm text-zinc-300">Jours travaillés</Label>
          <div className="flex gap-2">
            {dayLabels.map((label, index) => {
              const dayNum = index + 1
              const isActive = data.workDays.includes(dayNum)
              return (
                <button
                  key={dayNum}
                  onClick={() => toggleWorkDay(dayNum)}
                  className={cn(
                    'w-10 h-10 rounded-lg text-xs font-medium transition-all',
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 7: Done ───────────────────────────────────────────────────

function StepDone({ data, showCelebration }: { data: OnboardingData; showCelebration: boolean }) {
  const summaryItems = [
    { label: 'Nom', value: data.name || 'Non renseigné' },
    { label: 'Profession', value: data.profession || 'Non renseigné' },
    { label: 'Assistant', value: `${data.assistantName} (${toneConfig[data.assistantTone].label})` },
    { label: 'Projets', value: data.projects.length > 0 ? `${data.projects.length} projet(s)` : 'Aucun projet' },
    { label: 'Horaires', value: `${data.workHoursStart} - ${data.workHoursEnd}` },
  ]

  return (
    <div className="space-y-6 py-4 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: showCelebration ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto border-2 border-emerald-500"
      >
        {showCelebration ? (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Check className="w-10 h-10 text-emerald-400" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <Sparkles className="w-10 h-10 text-emerald-400" />
          </motion.div>
        )}
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-white">Votre espace est prêt !</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {data.name ? `Tout est configuré pour vous, ${data.name}` : 'Tout est configuré pour vous'}
        </p>
      </div>

      <div className="text-left space-y-2 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
        <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Récapitulatif</p>
        {summaryItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-zinc-700/50 last:border-0">
            <span className="text-sm text-zinc-400">{item.label}</span>
            <span className="text-sm text-white font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-emerald-400"
        >
          Redirection en cours...
        </motion.div>
      )}
    </div>
  )
}
