import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { contactCreateSchema, contactQuerySchema } from '@/lib/validations/crm'
import { getContacts, createContact } from '@/features/crm/services/contact-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } })
  }

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const filters = contactQuerySchema.parse(params)
    const result = await getContacts(auth.user.id, filters)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Paramètres invalides', details: err.issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } })
  }

  try {
    const body = await req.json()
    const data = contactCreateSchema.parse(body)
    const contact = await createContact(auth.user.id, data)
    return NextResponse.json(contact, { status: 201 })
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Données invalides', details: err.issues }, { status: 400 })
    if (err.message?.includes('existe déjà')) return NextResponse.json({ error: err.message }, { status: 409 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
