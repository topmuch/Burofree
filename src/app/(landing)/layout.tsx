/**
 * Landing Page Layout — Route Group (landing)
 *
 * Lightweight layout for the marketing landing page.
 * Deliberately does NOT include:
 *  - SessionProvider (no auth context needed)
 *  - Toaster (landing has its own inline feedback)
 *  - App sidebar or navigation
 *
 * Since the root layout.tsx provides <html> and <body>,
 * this layout only wraps children with landing-specific context
 * and CSS imports.
 *
 * Features:
 *  - Full SEO metadata
 *  - Open Graph / Twitter Cards
 *  - Canonical URLs
 *  - JSON-LD structured data (injected via page.tsx <script>)
 *  - Landing-specific CSS
 */

import type { Metadata } from 'next'
import './landing-globals.css'

// ─── Constants ─────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXTAUTH_URL || 'https://maellis.com'

// ─── SEO Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'Maellis — Le Copilote Intelligent pour Freelances',
    template: '%s | Maellis',
  },
  description:
    'Gérez vos tâches, emails, factures et calendrier en un seul endroit. Maellis automatise le reste avec l\'IA. Essai gratuit, sans carte bancaire.',
  keywords: [
    'freelance',
    'productivité',
    'assistant IA',
    'gestion de tâches',
    'facturation freelance',
    'calendrier',
    'emails',
    'suivi du temps',
    'Pomodoro',
    'portail client',
    'Maellis',
    'outil freelance',
    'gestion projet',
    'automatisation',
  ],
  authors: [{ name: 'Maellis', url: SITE_URL }],
  creator: 'Maellis',
  publisher: 'Maellis',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: 'Maellis',
    title: 'Maellis — Le Copilote Intelligent pour Freelances',
    description:
      'Gérez vos tâches, emails, factures et calendrier en un seul endroit. Maellis automatise le reste avec l\'IA.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Maellis — Assistant Intelligent Freelance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maellis — Le Copilote Intelligent pour Freelances',
    description:
      'Gérez vos tâches, emails, factures et calendrier en un seul endroit. Maellis automatise le reste avec l\'IA.',
    images: [`${SITE_URL}/og-image.png`],
    creator: '@maellis',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.svg',
  },
}

// ─── Layout Component ──────────────────────────────────────────────────────────────

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
