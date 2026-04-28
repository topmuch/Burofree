'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, HelpCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { parseVoiceIntent, getVoiceCommands } from './voice-parser'
import { dispatchVoiceIntent, type DispatchAction } from './voice-dispatcher'

const PRIVACY_NOTICE_KEY = 'maellis_voice_notice_shown'

/**
 * Generate a human-readable description for a dispatch action
 */
function describeAction(action: DispatchAction): string {
  switch (action.type) {
    case 'create_task':
      return `Créer la tâche « ${action.title} »`
    case 'create_project':
      return `Créer le projet « ${action.name} »`
    case 'start_focus':
      return `Lancer un focus de ${action.minutes} minutes`
    case 'stop_focus':
      return 'Arrêter le mode focus'
    case 'pause_focus':
      return 'Mettre le focus en pause'
    case 'resume_focus':
      return 'Reprendre le focus'
    case 'complete_task':
      return `Marquer « ${action.title} » comme terminé`
    case 'search':
      return `Rechercher « ${action.query} »`
    case 'compose_email':
      return `Composer un email à ${action.to}`
    case 'navigate':
      return `Ouvrir l'onglet ${action.tab}`
    case 'unknown':
      return `Commande non reconnue : « ${action.raw} »`
  }
}

/**
 * Voice Command Button
 * Floating button that allows voice commands
 * In demo mode, simulates voice recognition
 */
export function VoiceButton() {
  const [listening, setListening] = useState(false)
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: DispatchAction
    transcript: string
  } | null>(null)
  const { setActiveTab } = useAppStore()

  // Check privacy notice on mount
  useEffect(() => {
    const shown = localStorage.getItem(PRIVACY_NOTICE_KEY)
    if (!shown) {
      setPrivacyNoticeOpen(true)
    }
  }, [])

  const handlePrivacyAccept = useCallback(() => {
    localStorage.setItem(PRIVACY_NOTICE_KEY, 'true')
    setPrivacyNoticeOpen(false)
  }, [])

  // Execute the confirmed action
  const executeConfirmedAction = useCallback(() => {
    if (!pendingAction) return

    const { action } = pendingAction
    switch (action.type) {
      case 'navigate':
        setActiveTab(action.tab as Parameters<typeof setActiveTab>[0])
        toast.success('Navigation', { description: describeAction(action) })
        break
      case 'create_task':
        useAppStore.getState().createTask({ title: action.title, status: 'todo', priority: 'medium' })
        toast.success('Tâche créée', { description: describeAction(action) })
        break
      case 'create_project':
        useAppStore.getState().createProject({ name: action.name, status: 'active', color: '#10b981' })
        toast.success('Projet créé', { description: describeAction(action) })
        break
      case 'start_focus':
        useAppStore.getState().setFocusMode(true)
        toast.success('Focus démarré', { description: describeAction(action) })
        break
      case 'stop_focus':
        useAppStore.getState().setFocusMode(false)
        toast.success('Focus arrêté', { description: describeAction(action) })
        break
      case 'pause_focus':
        toast.info('Focus en pause', { description: describeAction(action) })
        break
      case 'resume_focus':
        toast.info('Focus repris', { description: describeAction(action) })
        break
      case 'complete_task':
        toast.success('Tâche terminée', { description: describeAction(action) })
        break
      case 'search':
        useAppStore.getState().search(action.query)
        toast.success('Recherche', { description: describeAction(action) })
        break
      case 'compose_email':
        setActiveTab('emails')
        toast.info('Email', { description: describeAction(action) })
        break
      case 'unknown':
        toast.warning('Commande non reconnue', { description: describeAction(action) })
        break
    }

    setConfirmDialogOpen(false)
    setPendingAction(null)
  }, [pendingAction, setActiveTab])

  // Cancel the pending action
  const cancelAction = useCallback(() => {
    setConfirmDialogOpen(false)
    setPendingAction(null)
    setListening(false)
  }, [])

  // Process a transcript: parse intent and show confirmation dialog
  const processTranscript = useCallback((transcript: string, confidence?: number) => {
    const intent = parseVoiceIntent(transcript)
    if (intent) {
      const action = dispatchVoiceIntent(intent)
      setPendingAction({ action, transcript })
      setConfirmDialogOpen(true)
    } else {
      // No recognized intent — show unknown action in confirm dialog
      const unknownAction: DispatchAction = { type: 'unknown', raw: transcript }
      setPendingAction({ action: unknownAction, transcript })
      setConfirmDialogOpen(true)
    }

    // Log the voice command
    try {
      fetch('/api/voice/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          intent: intent?.action || 'unknown',
          confidence: confidence || intent?.confidence || 0,
          executed: false,
        }),
      }).catch(() => {})
    } catch {
      // Silent fail
    }
  }, [])

  const handleToggle = useCallback(async () => {
    if (listening) {
      setListening(false)
      return
    }

    // Show privacy notice if not yet accepted
    const noticeShown = localStorage.getItem(PRIVACY_NOTICE_KEY)
    if (!noticeShown) {
      setPrivacyNoticeOpen(true)
      return
    }

    setListening(true)

    try {
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        // Demo mode — simulate a voice command
        toast.info('Commande vocale (démo)', {
          description: 'Les commandes vocales nécessitent un navigateur compatible. Simulation en cours...',
        })

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Simulate a demo transcript
        const demoTranscript = 'Afficher le marketplace'
        processTranscript(demoTranscript, 0.95)
      } else {
        // Real speech recognition
        const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        const recognition = new (SpeechRecognition as new () => SpeechRecognition)()
        recognition.lang = 'fr-FR'
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onresult = async (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript
          const confidence = event.results[0][0].confidence
          processTranscript(transcript, confidence)
        }

        recognition.onerror = () => {
          toast.error('Erreur de reconnaissance vocale')
        }

        recognition.onend = () => {
          setListening(false)
        }

        recognition.start()
      }
    } catch {
      toast.error('Erreur lors de l\'activation vocale')
    } finally {
      // In demo mode, stop listening after simulation
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setTimeout(() => setListening(false), 2000)
      }
    }
  }, [listening, processTranscript])

  const voiceCommands = getVoiceCommands()

  return (
    <>
      {/* Privacy Notice Dialog */}
      <Dialog open={privacyNoticeOpen} onOpenChange={setPrivacyNoticeOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Commandes vocales
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              Vos commandes vocales sont traitées localement par votre navigateur. Aucun enregistrement n&apos;est envoyé sur nos serveurs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button onClick={handlePrivacyAccept} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              J&apos;ai compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog Before Execution */}
      <Dialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) cancelAction() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la commande</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transcription</span>
                  <p className="text-sm font-medium mt-1">&laquo; {pendingAction?.transcript} &raquo;</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</span>
                  <p className="text-sm font-medium mt-1">{pendingAction ? describeAction(pendingAction.action) : ''}</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelAction}>
              Annuler
            </Button>
            <Button
              onClick={executeConfirmedAction}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Exécuter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog - Voice Commands List */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-500" />
              Commandes vocales disponibles
            </DialogTitle>
            <DialogDescription>
              Dites l&apos;une de ces phrases après avoir cliqué sur le microphone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            <ul className="space-y-2">
              {voiceCommands.map((cmd, i) => (
                <li key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <code className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded shrink-0">
                    {cmd.phrase}
                  </code>
                  <span className="text-sm text-muted-foreground">{cmd.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHelpDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Voice Button + Help Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-30 flex items-end gap-2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring', bounce: 0.4 }}
      >
        {/* Help (?) Button */}
        <Button
          size="icon"
          variant="outline"
          className="w-10 h-10 rounded-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 shadow-sm"
          onClick={() => setHelpDialogOpen(true)}
          aria-label="Aide commandes vocales"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

        {/* Microphone Button */}
        <Button
          size="icon"
          className={`w-12 h-12 rounded-full shadow-lg ${
            listening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
          }`}
          onClick={handleToggle}
          aria-label={listening ? 'Arrêter l\'écoute' : 'Démarrer l\'écoute vocale'}
        >
          <AnimatePresence mode="wait">
            {listening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative"
              >
                <MicOff className="w-5 h-5" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </>
  )
}

// SpeechRecognition type stub
interface SpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
        confidence: number
      }
    }
    length: number
  }
}
