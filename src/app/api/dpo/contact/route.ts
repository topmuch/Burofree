/**
 * POST /api/dpo/contact — Submit DPO contact request (can be from non-authenticated users)
 * GET /api/dpo/contact — List DPO requests (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { requireSuperAdmin } from '@/features/superadmin/utils/admin-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { getClientIp, getUserAgent } from '@/features/security/audit/logger'
import { logSecurityAction } from '@/features/security/audit/logger'
import { dpoContactSchema, dpoContactQuerySchema } from '@/lib/validations/security'
import { db } from '@/lib/db'

/**
 * POST — Submit DPO contact request
 * Public endpoint — does not require authentication.
 * Rate limited per IP to prevent abuse.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting — stricter for public endpoint
    const rateLimitId = getRateLimitIdentifier(req, 'dpo-contact')
    const rateLimit = checkRateLimit(rateLimitId, { maxRequests: 5, windowMs: 60 * 60 * 1000 }) // 5 per hour
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
        }
      )
    }

    // Validate input
    const body = await req.json()
    const parsed = dpoContactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = parsed.data
    const ipAddress = getClientIp(req)

    // Try to find user by email (optional — non-users can also contact DPO)
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    })

    // Create DPO contact request
    const dpoContact = await db.dpoContact.create({
      data: {
        userId: existingUser?.id || null,
        name,
        email,
        subject,
        message,
        status: 'open',
        ipAddress,
      },
    })

    // Log the action if user is authenticated
    if (existingUser) {
      await logSecurityAction({
        userId: existingUser.id,
        action: 'dpo.contact.created',
        target: 'dpo_contact',
        targetId: dpoContact.id,
        metadata: { subject },
        req,
      })
    }

    return NextResponse.json({
      message: 'Votre demande a été envoyée au DPO. Vous recevrez une réponse sous 30 jours.',
      id: dpoContact.id,
    }, { status: 201 })
  } catch (error) {
    console.error('DPO contact POST error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la demande' },
      { status: 500 }
    )
  }
}

/**
 * GET — List DPO contact requests (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      )
    }

    // Require superadmin
    const { admin, response } = await requireSuperAdmin(req)
    if (!admin) return response!

    // Parse query params
    const { searchParams } = new URL(req.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const parsed = dpoContactQuerySchema.safeParse(queryParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { status, limit } = parsed.data

    const where = status ? { status } : {}

    const contacts = await db.dpoContact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1 for cursor pagination
    })

    const hasMore = contacts.length > limit
    const items = hasMore ? contacts.slice(0, limit) : contacts
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      contacts: items,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    console.error('DPO contact GET error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des demandes DPO' },
      { status: 500 }
    )
  }
}
