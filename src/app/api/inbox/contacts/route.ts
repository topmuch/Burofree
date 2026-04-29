/**
 * GET /api/inbox/contacts — List contacts with search
 * POST /api/inbox/contacts — Create/update contact (upsert by email)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { listContactsQuerySchema, upsertContactSchema } from '@/lib/validations/inbox'
import { getContacts, upsertContact } from '@/features/unified-inbox/services/inbox-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const parsed = listContactsQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { search } = parsed.data
    const contacts = await getContacts(auth.user.id, search)
    return NextResponse.json({ data: contacts })
  } catch (error) {
    console.error('[inbox/contacts GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rateLimit = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = upsertContactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const contact = await upsertContact(auth.user.id, parsed.data)
    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('[inbox/contacts POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
