'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { CheckSquare, Mail, Receipt, Calendar, Bot, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: CheckSquare,
    title: 'Gestion de tâches',
    description:
      'Organisez vos projets avec un Kanban intuitif, des rappels automatiques et un suivi du temps intégré.',
  },
  {
    icon: Mail,
    title: 'Emails intelligents',
    description:
      'Connectez Gmail/Outlook, triez automatiquement, répondez avec l\'IA et convertissez en tâche en un clic.',
  },
  {
    icon: Receipt,
    title: 'Facturation',
    description:
      'Créez des factures professionnelles, acceptez les paiements Stripe et relancez automatiquement les impayés.',
  },
  {
    icon: Calendar,
    title: 'Calendrier unifié',
    description:
      'Sync Google/Microsoft Calendar, planifiez vos réunions et visualisez votre semaine idéale.',
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description:
      'Un assistant IA qui connaît votre activité, propose des actions et rédige vos emails.',
  },
  {
    icon: Target,
    title: 'Mode Focus',
    description:
      'Pomodoro, sons ambiants et blocage de distractions pour une productivité maximale.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <section
      className="relative py-20 sm:py-28 bg-background"
      aria-labelledby="features-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Un outil complet pensé pour les freelances, par des freelances.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={prefersReducedMotion ? undefined : containerVariants}
          initial={prefersReducedMotion ? undefined : 'hidden'}
          whileInView={prefersReducedMotion ? undefined : 'visible'}
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          role="list"
          aria-label="Fonctionnalités"
        >
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureCard({
  feature,
  prefersReducedMotion,
}: {
  feature: Feature
  prefersReducedMotion: boolean
}) {
  const Icon = feature.icon

  return (
    <motion.article
      variants={prefersReducedMotion ? undefined : cardVariants}
      role="listitem"
      className="group relative p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:shadow-lg hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950"
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-500 mb-5 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {feature.description}
      </p>
    </motion.article>
  )
}
