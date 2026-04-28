/**
 * GET /api/crm/campaigns/track/open/[pixelId] — Open tracking pixel
 * Returns a 1x1 transparent GIF
 */
import { NextRequest, NextResponse } from 'next/server'
import { trackOpen } from '@/features/campaigns/services/campaign-sender'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pixelId: string }> },
) {
  const { pixelId } = await params

  try {
    // Find the recipient by tracking pixel
    const recipient = await db.campaignRecipient.findFirst({
      where: { trackingPixel: pixelId },
    })

    if (recipient) {
      // Fire and forget — don't block the pixel response
      trackOpen(recipient.campaignId, recipient.contactId, pixelId).catch(() => {})
    }

    // Return 1x1 transparent GIF
    const gifBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    )

    return new NextResponse(gifBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch {
    // Still return the pixel even on error
    const gifBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    )
    return new NextResponse(gifBuffer, {
      headers: { 'Content-Type': 'image/gif' },
    })
  }
}
