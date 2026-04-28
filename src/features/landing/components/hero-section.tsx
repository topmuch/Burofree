'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Play, Star } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

const avatarColors = [
  'bg-emerald-400',
  'bg-sky-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-violet-400',
]

const avatarInitials = ['ML', 'TR', 'SM', 'JD', 'AB']

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden hero-gradient"
      aria-labelledby="hero-heading"
    >
      {/* Floating abstract shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="float-slow absolute top-[15%] left-[8%] w-72 h-72 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl" />
        <div className="float-medium absolute top-[40%] right-[10%] w-96 h-96 rounded-full bg-teal-500/5 dark:bg-teal-500/8 blur-3xl" />
        <div className="float-fast absolute bottom-[15%] left-[30%] w-64 h-64 rounded-full bg-emerald-400/5 dark:bg-emerald-400/8 blur-3xl" />
        {/* Geometric shapes */}
        <div className="float-slow absolute top-[20%] right-[20%] w-16 h-16 rotate-45 rounded-2xl border border-emerald-500/10 dark:border-emerald-500/20" />
        <div className="float-medium absolute bottom-[30%] left-[12%] w-12 h-12 rotate-12 rounded-full border border-teal-500/10 dark:border-teal-500/20" />
        <div className="float-fast absolute top-[60%] right-[35%] w-8 h-8 rotate-[30deg] rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <motion.div
          variants={prefersReducedMotion ? undefined : containerVariants}
          initial={prefersReducedMotion ? undefined : 'hidden'}
          animate="visible"
          className="flex flex-col items-center text-center lg:items-start lg:text-left"
        >
          {/* Main heading */}
          <motion.div variants={prefersReducedMotion ? undefined : itemVariants} className="max-w-3xl">
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground leading-[1.1]"
            >
              Votre copilote freelance{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-emerald-500">intelligent</span>
                <span
                  className="absolute bottom-1 left-0 w-full h-3 bg-emerald-500/20 rounded-sm -z-0"
                  aria-hidden="true"
                />
              </span>
            </h1>
          </motion.div>

          {/* Subheading */}
          <motion.p
            variants={prefersReducedMotion ? undefined : itemVariants}
            className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed lg:max-w-xl"
          >
            Gérez vos tâches, emails, factures et calendrier en un seul endroit.
            Burofree automatise le reste.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={prefersReducedMotion ? undefined : itemVariants}
            className="mt-10 flex flex-col sm:flex-row gap-4 items-center lg:items-start"
          >
            <Link
              href="/app"
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-all duration-200 emerald-glow"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#demo"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-foreground border border-border rounded-xl hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-all duration-200 bg-card dark:bg-transparent"
            >
              <Play className="h-4 w-4 text-emerald-500" />
              Voir la démo
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={prefersReducedMotion ? undefined : itemVariants}
            className="mt-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
          >
            {/* Avatar circles */}
            <div className="flex -space-x-2" aria-hidden="true">
              {avatarInitials.map((initials, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full ${avatarColors[i]} flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background`}
                >
                  {initials}
                </div>
              ))}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5" aria-label="Note 4.9 sur 5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < 4 ? 'text-amber-400 fill-amber-400' : 'text-amber-400 fill-amber-400/70'
                    }`}
                  />
                ))}
                <span className="ml-1.5 text-sm font-semibold text-foreground">4.9/5</span>
              </div>

              <span className="text-sm text-muted-foreground">
                Utilisé par <strong className="text-foreground font-semibold">2 500+</strong> freelances
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
