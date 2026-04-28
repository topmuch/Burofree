/**
 * Lead Capture API — Landing page email/waitlist signup
 *
 * POST /api/landing/lead
 * - Validates email + optional metadata with Zod
 * - Checks for duplicate emails (idempotent 200)
 * - Saves to LandingLead via Prisma
 * - Optionally sends welcome email via Resend (non-blocking)
 * - Rate-limited: max 5 submissions per IP per hour
 * - Public endpoint — no auth required
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { db } from '@/lib/db'
import { checkRateLimit, getRateLimitIdentifier, createRateLimitHeaders } from '@/lib/rate-limit'

// ─── Validation Schema ────────────────────────────────────────────────────────────

const leadSchema = z.object({
  email: z.email('Adresse email invalide'),
  name: z.string().max(100, 'Le nom ne peut pas dépasser 100 caractères').optional(),
  source: z.string().default('landing'),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  referralCode: z.string().optional(),
})

// ─── Rate Limiting ─────────────────────────────────────────────────────────────────

const LEAD_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 } // 5 per hour

// ─── Welcome Email (Resend) ────────────────────────────────────────────────────────

/**
 * Attempt to send a welcome email via Resend.
 * Non-blocking — if Resend is not configured or fails, we silently continue.
 */
async function sendWelcomeEmail(email: string, name?: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

  try {
    // Dynamic import so the module is only loaded when Resend is configured.
    // The 'resend' package may not be installed — we handle that gracefully.
    let ResendClass: new (key: string) => { emails: { send: (opts: unknown) => Promise<unknown> } }
    try {
      // @ts-expect-error — Resend is an optional dependency
      const mod = await import('resend')
      ResendClass = mod.Resend
    } catch {
      // Resend package not installed — skip email gracefully
      return
    }
    const resend = new ResendClass(resendApiKey)

    const firstName = name?.split(' ')[0] || 'cher freelance'

    await resend.emails.send({
      from: 'Burozen <bienvenue@burozen.com>',
      to: email,
      subject: 'Bienvenue sur Burozen ! 🎉',
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background: #141414; border-radius: 16px; border: 1px solid #262626; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Bienvenue ${firstName} !</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Votre copilote freelance vous attend</p>
            </div>
            <div style="padding: 32px;">
              <p style="font-size: 16px; line-height: 1.6; color: #d4d4d4;">
                Merci de votre inscription ! Burozen est votre assistant intelligent conçu pour les freelances.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #d4d4d4;">
                Voici ce que vous pouvez faire dès maintenant :
              </p>
              <ul style="font-size: 15px; line-height: 1.8; color: #a3a3a3; padding-left: 20px;">
                <li>Gérer vos tâches et projets en un coup d'œil</li>
                <li>Suivre votre temps et générer des factures</li>
                <li>Laisser l'IA vous aider au quotidien</li>
                <li>Synchroniser votre calendrier et vos emails</li>
              </ul>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'https://burozen.com'}/app"
                   style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                  Commencer maintenant →
                </a>
              </div>
              <p style="font-size: 13px; color: #737373; text-align: center; margin-top: 24px;">
                Vous recevez cet email car vous vous êtes inscrit sur burozen.com.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
  } catch (error) {
    // Silently log — never fail the lead capture because of email issues
    console.warn('[lead] Welcome email failed:', error instanceof Error ? error.message : error)
  }
}

// ─── POST Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit check ──
    const identifier = getRateLimitIdentifier(request, 'landing_lead')
    const rateLimitResult = checkRateLimit(identifier, LEAD_RATE_LIMIT)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Trop de soumissions. Veuillez réessayer dans une heure.' },
        {
          status: 429,
          headers: createRateLimitHeaders(LEAD_RATE_LIMIT, rateLimitResult.remaining, rateLimitResult.retryAfterMs),
        },
      )
    }

    // ── Parse & validate body ──
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de la requête invalide' },
        { status: 400 },
      )
    }

    const parseResult = leadSchema.safeParse(body)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Données invalides' },
        { status: 400 },
      )
    }

    const data = parseResult.data

    // ── Duplicate check ──
    const existing = await db.landingLead.findFirst({
      where: { email: data.email },
    })

    if (existing) {
      return NextResponse.json(
        { success: true, message: 'Déjà inscrit' },
        {
          status: 200,
          headers: createRateLimitHeaders(LEAD_RATE_LIMIT, rateLimitResult.remaining),
        },
      )
    }

    // ── Save lead ──
    await db.landingLead.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        source: data.source,
        utmSource: data.utmSource ?? null,
        utmMedium: data.utmMedium ?? null,
        utmCampaign: data.utmCampaign ?? null,
        utmContent: data.utmContent ?? null,
        referralCode: data.referralCode ?? null,
      },
    })

    // ── Welcome email (fire-and-forget) ──
    // We intentionally don't await this — the user shouldn't wait for the email
    sendWelcomeEmail(data.email, data.name ?? undefined).catch(() => {
      // Already handled inside sendWelcomeEmail, but double-catch for safety
    })

    return NextResponse.json(
      { success: true, message: 'Inscription réussie !' },
      {
        status: 201,
        headers: createRateLimitHeaders(LEAD_RATE_LIMIT, rateLimitResult.remaining),
      },
    )
  } catch (error) {
    console.error('[lead] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
