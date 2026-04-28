/**
 * Dynamic Open Graph Image Generation Route
 *
 * Generates OG images on-the-fly using Next.js ImageResponse.
 * Supports custom title and description via query parameters
 * for dynamic page-level OG images.
 *
 * Usage:
 *   /api/og                  → Default Burozen branding
 *   /api/og?title=Custom     → Custom title
 *   /api/og?title=X&desc=Y   → Custom title + description
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route
 */

import { ImageResponse } from 'next/og'
export const runtime = 'edge'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://burozen.com'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const title = searchParams.get('title') || 'Burozen'
  const description =
    searchParams.get('desc') ||
    searchParams.get('description') ||
    'Le Copilote Intelligent pour Freelances'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #064e3b 0%, #10b981 50%, #34d399 100%)',
          padding: '60px',
        }}
      >
        {/* Background pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.06,
          }}
        >
          <div
            style={{
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              border: '2px solid white',
              position: 'absolute',
              top: '-100px',
              right: '-100px',
            }}
          />
          <div
            style={{
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              border: '2px solid white',
              position: 'absolute',
              bottom: '-80px',
              left: '-80px',
            }}
          />
        </div>

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <span
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: 'white',
              }}
            >
              M
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 30 ? 48 : title.length > 20 ? 56 : 72,
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            maxWidth: '900px',
          }}
        >
          {title}
        </div>

        {/* Separator */}
        <div
          style={{
            width: '80px',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255, 255, 255, 0.5)',
            marginTop: '24px',
            marginBottom: '24px',
          }}
        />

        {/* Description */}
        <div
          style={{
            display: 'flex',
            fontSize: description.length > 60 ? 22 : description.length > 40 ? 26 : 30,
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            lineHeight: 1.4,
            maxWidth: '800px',
          }}
        >
          {description}
        </div>

        {/* URL */}
        <div
          style={{
            display: 'flex',
            marginTop: '40px',
            fontSize: 18,
            color: 'rgba(255, 255, 255, 0.6)',
            letterSpacing: '0.05em',
          }}
        >
          {SITE_URL.replace('https://', '').replace('http://', '')}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
