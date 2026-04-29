/**
 * GET /api/crm/campaigns/track/click/[trackingId] — Click tracking redirect
 */
import { NextRequest, NextResponse } from 'next/server'
import { trackClick } from '@/features/campaigns/services/campaign-sender'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> },
) {
  const { trackingId } = await params

  try {
    const originalUrl = await trackClick(trackingId)
    return NextResponse.redirect(originalUrl)
  } catch {
    // Fallback redirect to home
    return NextResponse.redirect(new URL('/', _req.url))
  }
}
