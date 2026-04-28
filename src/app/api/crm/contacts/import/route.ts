import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { csvImportSchema } from '@/lib/validations/crm'
import { importContactsCSV } from '@/features/crm/services/contact-service'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), { maxRequests: 5, windowMs: 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const data = csvImportSchema.parse(body)
    const result = await importContactsCSV(auth.user.id, data.data, data.teamId, data.mapping)
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Données invalides', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
