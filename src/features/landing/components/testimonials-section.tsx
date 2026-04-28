'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Quote } from 'lucide-react'

interface Testimonial {
  quote: string
  name: string
  role: string
  metric: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Burozen m'a fait gagner 3h par semaine sur la gestion admin. Je me concentre enfin sur mon métier.",
    name: 'Marie L.',
    role: 'Designer freelance',
    metric: '+3h/semaine',
  },
  {
    quote:
      'La facturation automatisée et les relances m\'ont permis de réduire mes impayés de 40%.',
    name: 'Thomas R.',
    role: 'Développeur',
    metric: '-40% impayés',
  },
  {
    quote:
      "L'assistant IA est bluffant. Il rédige mes emails clients en 30 secondes.",
    name: 'Sophie M.',
    role: 'Consultante',
    metric: '30s/email',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
}

export function TestimonialsSection() {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <section
      className="relative py-20 sm:py-28 bg-background"
      aria-labelledby="testimonials-heading"
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
            id="testimonials-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Ils nous font confiance
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez comment Burozen transforme le quotidien des freelances.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.blockquote
              key={testimonial.name}
              custom={i}
              variants={prefersReducedMotion ? undefined : cardVariants}
              initial={prefersReducedMotion ? undefined : 'hidden'}
              whileInView={prefersReducedMotion ? undefined : 'visible'}
              viewport={{ once: true, margin: '-60px' }}
              className="relative flex flex-col p-6 sm:p-8 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-emerald-500/5 transition-shadow duration-300"
            >
              {/* Quote icon */}
              <Quote
                className="h-8 w-8 text-emerald-500/20 dark:text-emerald-500/30 mb-4 flex-shrink-0"
                aria-hidden="true"
              />

              {/* Quote text */}
              <p className="text-base sm:text-lg leading-relaxed text-foreground flex-1">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-sm font-bold text-emerald-500">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <cite className="text-sm font-semibold text-foreground not-italic">
                      {testimonial.name}
                    </cite>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>

                {/* Metric badge */}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                  {testimonial.metric}
                </span>
              </div>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
