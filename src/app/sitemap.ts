/**
 * Dynamic Sitemap Generator — Next.js App Router
 *
 * Generates an XML sitemap for search engine crawlers.
 * Includes all public-facing pages with appropriate
 * lastModified timestamps, change frequencies, and priorities.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://burozen.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const legalDate = new Date('2025-01-01')

  return [
    // ─── Main Pages ────────────────────────────────────────────────────────────────
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/app`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },

    // ─── Legal Pages ───────────────────────────────────────────────────────────────
    {
      url: `${SITE_URL}/legal/cgv`,
      lastModified: legalDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/legal/privacy`,
      lastModified: legalDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/legal/mentions`,
      lastModified: legalDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
