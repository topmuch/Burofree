import { NextRequest, NextResponse } from 'next/server'
import { generateInvoiceToken } from '@/lib/invoice-token'
import { requireAuth } from '@/lib/auth-guard'

/**
 * Generate a token for accessing the invoice PDF without a session cookie.
 * Requires the user to be authenticated via NextAuth session.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) {
    return auth.response!
  }

  const { id } = await params
  const token = await generateInvoiceToken(id)

  return NextResponse.json({ token })
}
