'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface ConnectAccountDialogProps {
  children: React.ReactNode
}

const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    description: 'Connectez votre compte Google pour recevoir et envoyer des emails',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: Mail,
    description: 'Connectez votre compte Microsoft 365',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
]

export function ConnectAccountDialog({
  children,
}: ConnectAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)

  const handleConnect = async () => {
    if (!selectedProvider) return
    setConnecting(true)

    // Simulate OAuth flow (placeholder)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setConnecting(false)
    setConnected(true)

    // Close after success animation
    setTimeout(() => {
      setOpen(false)
      setConnected(false)
      setSelectedProvider(null)
    }, 2000)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (connecting) return
    setOpen(nextOpen)
    if (!nextOpen) {
      setSelectedProvider(null)
      setConnected(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Connecter un canal
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Connectez votre compte email pour recevoir et envoyer des messages
            depuis la boîte unifiée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon
            const isSelected = selectedProvider === provider.id

            return (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                disabled={connecting || connected}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  isSelected
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                } ${connected ? 'opacity-50' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-lg ${provider.bgColor} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${provider.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">
                    {provider.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {provider.description}
                  </p>
                </div>
                {isSelected && !connected && (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Connection status */}
        {connected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-300">
                Compte connecté !
              </p>
              <p className="text-[11px] text-emerald-400/70">
                Vos messages seront synchronisés automatiquement.
              </p>
            </div>
          </motion.div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={connecting}
            className="text-zinc-400 hover:text-zinc-200"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!selectedProvider || connecting || connected}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connexion...
              </>
            ) : connected ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Connecté
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connecter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
