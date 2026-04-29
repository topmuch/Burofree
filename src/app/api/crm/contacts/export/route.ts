import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { contactQuerySchema } from '@/lib/validations/crm'
import { exportContactsCSV } from '@/features/crm/services/contact-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), { maxRequests: 10, windowMs: 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const filters = contactQuerySchema.parse(params)
    const csv = await exportContactsCSV(auth.user.id, filters)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `contacts-export-${new Date().toISOString().split('T')[0]}.csv`,
      },
    })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Paramètres invalides', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
