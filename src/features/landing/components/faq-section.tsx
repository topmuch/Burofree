'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    question: 'Burofree est-il gratuit ?',
    answer:
      'Oui, Burofree propose un plan gratuit sans carte bancaire avec 5 projets et 50 tâches. Passez au plan Pro pour débloquer les fonctionnalités avancées.',
  },
  {
    question: 'Puis-je connecter ma messagerie ?',
    answer:
      'Absolument. Burofree supporte Gmail et Outlook avec synchronisation bidirectionnelle, tri automatique et réponse par IA.',
  },
  {
    question: 'Comment fonctionne la facturation ?',
    answer:
      'Créez vos factures en 2 minutes, partagez un lien de paiement Stripe à votre client, et les relances sont automatisées.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Vos données sont chiffrées (AES-256), hébergées en Europe (RGPD), et nous ne revendons jamais vos informations.',
  },
  {
    question: 'Puis-je annuler à tout moment ?',
    answer:
      'Oui, sans engagement. Vous pouvez annuler votre abonnement en un clic depuis vos paramètres.',
  },
  {
    question: 'Burofree convient-il aux équipes ?',
    answer:
      'Le plan Entreprise permet jusqu\'à 10 membres avec des rôles (admin, membre, viewer) et un portail client partagé.',
  },
]

export function FaqSection() {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <section
      className="relative py-20 sm:py-28 bg-muted/30"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2
            id="faq-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Questions fréquentes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tout ce que vous devez savoir sur Burofree.
          </p>
        </motion.div>

        {/* Accordion */}
        <div
          role="region"
          aria-labelledby="faq-heading"
        >
          <FaqAccordion items={faqItems} prefersReducedMotion={prefersReducedMotion} />
        </div>
      </div>
    </section>
  )
}

function FaqAccordion({
  items,
  prefersReducedMotion,
}: {
  items: FaqItem[]
  prefersReducedMotion: boolean
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const toggleItem = useCallback((index: number) => {
    setOpenIndex(prev => (prev === index ? null : index))
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          nextIndex = (index + 1) % items.length
          break
        case 'ArrowUp':
          e.preventDefault()
          nextIndex = (index - 1 + items.length) % items.length
          break
        case 'Home':
          e.preventDefault()
          nextIndex = 0
          break
        case 'End':
          e.preventDefault()
          nextIndex = items.length - 1
          break
        default:
          return
      }

      if (nextIndex !== null) {
        buttonRefs.current[nextIndex]?.focus()
      }
    },
    [items.length]
  )

  // Stagger animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
    },
  }

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial={prefersReducedMotion ? undefined : 'hidden'}
      whileInView={prefersReducedMotion ? undefined : 'visible'}
      viewport={{ once: true, margin: '-60px' }}
      className="divide-y divide-zinc-200 dark:divide-zinc-800 border-y border-zinc-200 dark:border-zinc-800"
    >
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const panelId = `faq-panel-${index}`
        const buttonId = `faq-button-${index}`

        return (
          <motion.div
            key={index}
            variants={prefersReducedMotion ? undefined : itemVariants}
          >
            <h3>
              <button
                ref={el => { buttonRefs.current[index] = el }}
                id={buttonId}
                onClick={() => toggleItem(index)}
                onKeyDown={e => handleKeyDown(e, index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 py-5 text-left group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 rounded-sm"
              >
                <span className="text-base sm:text-lg font-medium text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
                    opacity: { duration: 0.2, delay: 0.05 },
                  }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 pr-12">
                    <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
