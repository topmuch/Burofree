/**
 * Landing Page — Burofree Marketing Homepage
 *
 * Assembles all landing page sections in a conversion-optimized layout:
 *  1. Header (sticky nav)
 *  2. Hero Section (value prop + CTA)
 *  3. Social Proof Logos
 *  4. Features Grid
 *  5. Pricing (Stripe-integrated)
 *  6. Testimonials
 *  7. Bottom CTA (final conversion push)
 *  8. FAQ
 *  9. Footer
 * 10. Consent Banner (GDPR)
 *
 * Performance:
 *  - Sections use whileInView animations (no JS until visible)
 *  - Dynamic imports for heavy components where possible
 *  - JSON-LD FAQ schema injected for Google rich results
 *  - Scroll depth tracking via useScrollDepth hook
 *  - UTM parameter persistence via useUTM hook
 *
 * SEO:
 *  - Metadata defined in layout.tsx (generateMetadata)
 *  - FAQ JSON-LD schema for rich snippets
 *  - Semantic HTML (section, article, nav, etc.)
 *  - All headings properly structured (h1 → h2 → h3)
 */

import { LandingHeader } from '@/features/landing/components/landing-header'
import { HeroSection } from '@/features/landing/components/hero-section'
import { FeaturesSection } from '@/features/landing/components/features-section'
import { PricingSection } from '@/features/landing/components/pricing-section'
import { TestimonialsSection } from '@/features/landing/components/testimonials-section'
import { FaqSection } from '@/features/landing/components/faq-section'
import { FooterSection } from '@/features/landing/components/footer-section'
import { ConsentBanner } from '@/features/landing/components/consent-banner'
import { LeadCaptureForm } from '@/features/landing/components/lead-capture-form'
import { LandingPageTracker } from '@/features/landing/components/landing-page-tracker'
import { getFAQPageLD } from '@/features/landing/utils/json-ld'

// ─── FAQ Data (shared with FAQ section + JSON-LD) ─────────────────────────────────

const FAQ_DATA = [
  {
    question: 'Burofree est-il gratuit ?',
    answer:
      'Oui, Burofree propose un plan gratuit sans carte bancaire avec 3 projets et 50 tâches. Passez au plan Pro pour débloquer les fonctionnalités avancées.',
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
      'Le plan Entreprise permet jusqu\'à 25 membres avec des rôles (admin, membre, viewer) et un portail client partagé.',
  },
]

// ─── Page Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  // Generate FAQ JSON-LD for rich snippets
  const faqJsonLd = getFAQPageLD(FAQ_DATA)

  return (
    <>
      {/* FAQ JSON-LD — separate from layout-level JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Tracking hooks (client component, invisible) */}
      <LandingPageTracker />

      {/* Sticky Header */}
      <LandingHeader />

      {/* Main Content */}
      <main>
        {/* 1. Hero — Primary conversion section */}
        <HeroSection />

        {/* 2. Social Proof Logos — Trust indicators */}
        <SocialProofBar />

        {/* 3. Features — Product value demonstration */}
        <FeaturesSection />

        {/* 4. Pricing — Conversion critical */}
        <PricingSection />

        {/* 5. Testimonials — Social proof */}
        <TestimonialsSection />

        {/* 6. Bottom CTA — Final conversion push */}
        <BottomCTASection />

        {/* 7. FAQ — Objection handling + SEO */}
        <FaqSection />
      </main>

      {/* Footer */}
      <FooterSection />

      {/* GDPR Consent Banner */}
      <ConsentBanner />
    </>
  )
}

// ─── Social Proof Bar ──────────────────────────────────────────────────────────────

function SocialProofBar() {
  const logos = [
    { name: 'TechCrunch', label: 'TechCrunch' },
    { name: 'ProductHunt', label: 'Product Hunt' },
    { name: 'Les Echos', label: 'Les Échos' },
    { name: 'Maddynity', label: 'Maddynity' },
    { name: 'SaaSmag', label: 'SaaS Magazine' },
  ]

  return (
    <section className="py-12 sm:py-16 bg-muted/20 border-y border-zinc-100 dark:border-zinc-800/50" aria-label="Presse et reconnaissance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground mb-8">
          Ils parlent de nous
        </p>
        <div className="flex items-center justify-center gap-8 sm:gap-12 lg:gap-16 flex-wrap opacity-40 dark:opacity-30">
          {logos.map((logo) => (
            <span
              key={logo.name}
              className="text-lg sm:text-xl font-bold text-foreground tracking-tight"
            >
              {logo.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Bottom CTA Section ────────────────────────────────────────────────────────────

function BottomCTASection() {
  return (
    <section
      className="relative py-20 sm:py-28 bg-background overflow-hidden"
      aria-labelledby="bottom-cta-heading"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          id="bottom-cta-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
        >
          Prêt à simplifier votre{' '}
          <span className="text-emerald-500">vie de freelance</span> ?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Rejoignez plus de 2 500 freelances qui ont déjà gagné du temps grâce à Burofree.
          Essai gratuit, sans carte bancaire.
        </p>

        <div className="mt-8">
          <LeadCaptureForm
            source="bottom_cta"
            ctaText="Commencer gratuitement"
            showName={false}
            variant="inline"
          />
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Sans carte bancaire
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            14 jours d&apos;essai
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Annulation en 1 clic
          </span>
        </div>
      </div>
    </section>
  )
}
