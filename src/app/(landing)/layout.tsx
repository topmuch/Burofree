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

const SITE_URL = process.env.NEXTAUTH_URL || 'https://burofree.com'

// ─── SEO Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'Burofree — Le Copilote Intelligent pour Freelances',
    template: '%s | Burofree',
  },
  description:
    'Gérez vos tâches, emails, factures et calendrier en un seul endroit. Burofree automatise le reste avec l\'IA. Essai gratuit, sans carte bancaire.',
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
    'Burofree',
    'outil freelance',
    'gestion projet',
    'automatisation',
  ],
  authors: [{ name: 'Burofree', url: SITE_URL }],
  creator: 'Burofree',
  publisher: 'Burofree',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: 'Burofree',
    title: 'Burofree — Le Copilote Intelligent pour Freelances',
    description:
      'Gérez vos tâches, emails, factures et calendrier en un seul endroit. Burofree automatise le reste avec l\'IA.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Burofree — Assistant Intelligent Freelance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Burofree — Le Copilote Intelligent pour Freelances',
    description:
      'Gérez vos tâches, emails, factures et calendrier en un seul endroit. Burofree automatise le reste avec l\'IA.',
    images: [`${SITE_URL}/og-image.png`],
    creator: '@burofree',
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
