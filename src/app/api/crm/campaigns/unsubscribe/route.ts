/**
 * GET /api/crm/campaigns/unsubscribe — Unsubscribe page
 * ?token=xxx&contactId=xxx
 */
import { NextRequest, NextResponse } from 'next/server'
import { unsubscribe } from '@/features/campaigns/services/campaign-sender'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const contactId = req.nextUrl.searchParams.get('contactId')

  if (!token || !contactId) {
    return NextResponse.json({ error: 'Missing token or contactId' }, { status: 400 })
  }

  try {
    await unsubscribe(contactId, token)

    // Return a simple HTML page confirming unsubscription
    const html = `<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title></head>
<body style="font-family:system-ui;max-width:500px;margin:80px auto;padding:20px;text-align:center">
  <h1 style="color:#10b981">✓ Unsubscribed</h1>
  <p>You have been successfully unsubscribed. You will no longer receive emails from this sender.</p>
  <p style="color:#71717a;font-size:14px">This may take up to 10 business days to process, as required by CAN-SPAM regulations.</p>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid unsubscribe link' }, { status: 400 })
  }
}
