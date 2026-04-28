'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Key, FileText, Users, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { TwoFactorStatusCard } from './two-factor-status'
import { GdprPanel } from './gdpr-panel'
import { AuditLogViewer } from './audit-log-viewer'
import { RoleManager } from './role-manager'
import { SecurityAlertsPanel } from './security-alerts-panel'

const tabVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function SecurityPanel() {
  const [activeTab, setActiveTab] = useState('2fa')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Sécurité & Conformité</h2>
          <p className="text-xs text-muted-foreground">
            Authentification, chiffrement, RGPD, audit et permissions
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 ml-auto">
          PRIORITÉ 5
        </Badge>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-zinc-900 border border-zinc-800 h-auto p-1">
          <TabsTrigger
            value="2fa"
            className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 text-xs gap-1.5 py-2"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2FA</span>
          </TabsTrigger>
          <TabsTrigger
            value="gdpr"
            className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 text-xs gap-1.5 py-2"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RGPD</span>
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 text-xs gap-1.5 py-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 text-xs gap-1.5 py-2"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Alertes</span>
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 text-xs gap-1.5 py-2"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rôles</span>
          </TabsTrigger>
        </TabsList>

        <motion.div variants={tabVariants} initial="hidden" animate="visible" key={activeTab}>
          <TabsContent value="2fa" className="mt-6 max-w-2xl">
            <TwoFactorStatusCard />
          </TabsContent>

          <TabsContent value="gdpr" className="mt-6">
            <GdprPanel />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <SecurityAlertsPanel />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RoleManager />
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  )
}
