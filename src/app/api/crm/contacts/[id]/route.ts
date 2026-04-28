import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireTeamAccess } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { contactUpdateSchema } from '@/lib/validations/crm'
import { getContact, updateContact, deleteContact } from '@/features/crm/services/contact-service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const contact = await getContact(id, auth.user.id)
    if (!contact) return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    // If contact belongs to a team, verify team membership
    const contactTeamId = (contact as any).teamId as string | undefined
    if (contactTeamId) {
      const membership = await requireTeamAccess(auth.user.id, contactTeamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }
    return NextResponse.json(contact)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const data = contactUpdateSchema.parse(body)
    // If teamId is provided in body, verify team membership
    const teamId = (data as any).teamId as string | undefined
    if (teamId) {
      const membership = await requireTeamAccess(auth.user.id, teamId)
      if (!membership) {
        return NextResponse.json({ error: 'Accès refusé à cet espace' }, { status: 403 })
      }
    }
    const contact = await updateContact(id, auth.user.id, data)
    return NextResponse.json(contact)
  } catch (err: any) {
    if (err.issues) return NextResponse.json({ error: 'Données invalides', details: err.issues }, { status: 400 })
    if (err.message?.includes('non trouvé')) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err.message?.includes('email')) return NextResponse.json({ error: err.message }, { status: 409 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req, auth.user.id), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  try {
    const { id } = await params
    const result = await deleteContact(id, auth.user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message?.includes('non trouvé')) return NextResponse.json({ error: err.message }, { status: 404 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
