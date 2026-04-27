import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { portalInviteCreateSchema } from '@/lib/validations/differentiation'
import { generatePortalToken } from '@/features/differentiation/portal/portal-token'
import { nanoid } from 'nanoid'

/**
 * POST /api/portal/invite — Create a portal invitation
 */
export async function POST(req: NextRequest) {
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

    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    // Validate input
    const body = await req.json()
    const parsed = portalInviteCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { projectId, clientEmail, clientName, expiresInDays } = parsed.data

    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id: projectId, userId: user.id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projet introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    // Generate invite token
    const rawToken = nanoid(21)
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    // Create invite
    const invite = await db.portalInvite.create({
      data: {
        projectId,
        token: rawToken,
        email: clientEmail,
        clientName,
        expiresAt,
        createdById: user.id,
      },
    })

    // Generate HMAC signed token
    const signedToken = generatePortalToken(projectId, invite.id)

    // Update invite with signed token
    await db.portalInvite.update({
      where: { id: invite.id },
      data: { token: signedToken },
    })

    // Build portal URL
    const portalUrl = `/portal/${projectId}/${signedToken}`

    // Try to send email via Resend if configured
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const fullUrl = `${baseUrl}${portalUrl}`

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Burofree <noreply@burofree.app>',
            to: [clientEmail],
            subject: `${user.name || 'Votre freelance'} vous invite à suivre le projet "${project.name}"`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Accès au projet "${project.name}"</h2>
                <p>Bonjour ${clientName},</p>
                <p>${user.name || 'Votre freelance'} vous a invité à suivre l'avancement du projet <strong>${project.name}</strong>.</p>
                <p>Cliquez sur le lien ci-dessous pour accéder au portail :</p>
                <a href="${fullUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Accéder au portail</a>
                <p style="color: #666; font-size: 12px; margin-top: 16px;">Ce lien expire le ${expiresAt.toLocaleDateString('fr-FR')}.</p>
              </div>
            `,
          }),
        })
      } catch (emailError) {
        console.error('Failed to send portal invite email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      message: 'Invitation créée avec succès',
      invite: {
        id: invite.id,
        token: signedToken,
        email: clientEmail,
        clientName,
        expiresAt,
        portalUrl,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Portal invite POST error:', error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'invitation" },
      { status: 500 }
    )
  }
}
