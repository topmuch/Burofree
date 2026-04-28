/**
 * SMTP Configuration API — Admin Endpoint
 *
 * GET  - Get current SMTP configuration (password masked)
 * POST - Save SMTP configuration
 * DELETE - Disable SMTP
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveSmtpConfig, getSmtpConfigStatus, disableSmtp, enableSmtp, type SmtpConfig } from '@/lib/email'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const status = await getSmtpConfigStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('SMTP config GET error:', error)
    return NextResponse.json({ error: 'Failed to load SMTP config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    const { host, port, secure, user, pass, fromName, fromEmail, replyTo } = body

    if (!host || !port || !user || !pass || !fromEmail) {
      return NextResponse.json(
        { error: 'Champs requis manquants : host, port, user, pass, fromEmail' },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(fromEmail)) {
      return NextResponse.json(
        { error: 'Adresse email expéditeur invalide' },
        { status: 400 },
      )
    }

    // Validate port
    const portNum = parseInt(String(port), 10)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json(
        { error: 'Port invalide (1-65535)' },
        { status: 400 },
      )
    }

    const config: SmtpConfig = {
      host,
      port: portNum,
      secure: Boolean(secure),
      user,
      pass,
      fromName: fromName || 'Maellis',
      fromEmail,
      replyTo: replyTo || undefined,
    }

    await saveSmtpConfig(config)
    await enableSmtp()

    // Create audit log
    try {
      const adminUser = await db.user.findFirst({ where: { role: 'superadmin' } })
      if (adminUser) {
        await db.auditLog.create({
          data: {
            userId: adminUser.id,
            action: 'smtp.config.update',
            target: 'platform_config',
            metadata: JSON.stringify({ host: config.host, port: config.port, fromEmail: config.fromEmail }),
          },
        })
      }
    } catch {
      // Audit log failure shouldn't block the operation
    }

    return NextResponse.json({ success: true, message: 'Configuration SMTP sauvegardée' })
  } catch (error) {
    console.error('SMTP config POST error:', error)
    return NextResponse.json({ error: 'Failed to save SMTP config' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await disableSmtp()

    return NextResponse.json({ success: true, message: 'Notifications SMTP désactivées' })
  } catch (error) {
    console.error('SMTP config DELETE error:', error)
    return NextResponse.json({ error: 'Failed to disable SMTP' }, { status: 500 })
  }
}
