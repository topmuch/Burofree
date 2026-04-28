/**
 * JSON-LD Structured Data — Maellis Landing Page
 *
 * Generates Schema.org structured data for SEO-rich results.
 * These objects are meant to be embedded in <script type="application/ld+json">
 * tags on the landing page for Google rich snippets, FAQ panels, etc.
 *
 * @see https://schema.org/SoftwareApplication
 * @see https://schema.org/FAQPage
 * @see https://schema.org/Organization
 */

import { PRICING_PLANS } from './pricing-data'

// ─── Constants ──────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXTAUTH_URL || 'https://maellis.com'
const SITE_NAME = 'Maellis'
const LOGO_URL = `${SITE_URL}/logo.svg`

// ─── SoftwareApplication Schema ─────────────────────────────────────────────────────

/**
 * Returns a SoftwareApplication JSON-LD schema for Maellis.
 * Includes pricing offers and an aggregate rating.
 */
export function getSoftwareApplicationLD() {
  const freePlan = PRICING_PLANS.find((p) => p.id === 'free')
  const proPlan = PRICING_PLANS.find((p) => p.id === 'pro')

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    description:
      'Assistant intelligent pour freelances — tâches, calendrier, emails, facturation, suivi du temps et IA.',
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '1.0',
    offers: [
      freePlan
        ? {
            '@type': 'Offer',
            name: freePlan.name,
            description: freePlan.description,
            price: freePlan.monthlyPrice,
            priceCurrency: 'EUR',
            billingPeriod: 'P1M',
            availability: 'https://schema.org/InStock',
          }
        : null,
      proPlan
        ? {
            '@type': 'Offer',
            name: proPlan.name,
            description: proPlan.description,
            price: proPlan.monthlyPrice,
            priceCurrency: 'EUR',
            billingPeriod: 'P1M',
            availability: 'https://schema.org/InStock',
          }
        : null,
    ].filter(Boolean),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '127',
      reviewCount: '89',
    },
    screenshot: `${SITE_URL}/og-image.png`,
    featureList: [
      'Gestion des tâches',
      'Calendrier synchronisé',
      'Facturation automatisée',
      'Suivi du temps',
      'Assistant IA',
      'Mode Focus',
      'Portail client',
    ],
  }
}

// ─── FAQPage Schema ─────────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string
  answer: string
}

/**
 * Returns a FAQPage JSON-LD schema from an array of FAQ data.
 * This enables Google to display FAQ rich results in search.
 */
export function getFAQPageLD(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// ─── Organization Schema ────────────────────────────────────────────────────────────

/**
 * Returns an Organization JSON-LD schema for Maellis.
 * Includes social media links for Google Knowledge Panel.
 */
export function getOrganizationLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
      width: 512,
      height: 512,
    },
    description:
      'Maellis est l\'assistant intelligent pour freelances. Gérez vos tâches, calendrier, emails, facturation et plus — propulsé par l\'IA.',
    foundingDate: '2024',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@maellis.com',
      availableLanguage: ['French', 'English'],
    },
    sameAs: [
      'https://twitter.com/maellis',
      'https://linkedin.com/company/maellis',
      'https://github.com/maellis',
      'https://www.instagram.com/maellis',
    ],
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────────────

/**
 * Combine multiple JSON-LD schemas into a single array.
 * Useful for rendering all schemas in one <script> tag.
 */
export function combineJsonLD(...schemas: object[]): object {
  if (schemas.length === 1) return schemas[0]
  return {
    '@context': 'https://schema.org',
    '@graph': schemas,
  }
}
