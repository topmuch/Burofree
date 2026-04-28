/**
 * Robots.txt Configuration — Next.js App Router
 *
 * Controls search engine crawler access.
 * - Allows all crawlers on public pages
 * - Disallows /app/, /api/, /superadmin/ (private areas)
 * - Points to the sitemap.xml
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://burofree.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/api/', '/superadmin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
