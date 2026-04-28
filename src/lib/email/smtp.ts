/**
 * SMTP Client Configuration — Maellis Email Notification System
 *
 * Handles SMTP connection pooling, configuration management,
 * and email sending via nodemailer.
 *
 * Supports:
 *  - Custom SMTP servers (Gmail, OVH, Scaleway, SendGrid, etc.)
 *  - Connection pooling for performance
 *  - TLS/SSL configuration
 *  - Config persistence via PlatformConfig table
 *  - Test email sending
 */

import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer'
import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean       // true = SSL/TLS on port 465, false = STARTTLS on 587
  user: string
  pass: string
  fromName: string      // Display name for "From" header
  fromEmail: string     // Email address for "From" header
  replyTo?: string      // Optional Reply-To address
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ─── Config Keys ──────────────────────────────────────────────────────────────────

const CONFIG_KEYS = {
  host: 'smtp_host',
  port: 'smtp_port',
  secure: 'smtp_secure',
  user: 'smtp_user',
  pass: 'smtp_pass',
  fromName: 'smtp_from_name',
  fromEmail: 'smtp_from_email',
  replyTo: 'smtp_reply_to',
  enabled: 'smtp_enabled',
} as const

// ─── Singleton Transporter ────────────────────────────────────────────────────────

let cachedTransporter: Transporter | null = null
let cachedConfigHash: string | null = null

function configHash(config: SmtpConfig): string {
  return `${config.host}:${config.port}:${config.user}:${config.pass}:${config.secure}`
}

/**
 * Create or reuse a nodemailer transporter based on the given config.
 * Re-creates the transporter if the config has changed.
 */
function getTransporter(config: SmtpConfig): Transporter {
  const hash = configHash(config)

  if (cachedTransporter && cachedConfigHash === hash) {
    return cachedTransporter
  }

  // Close old transporter if exists
  if (cachedTransporter) {
    cachedTransporter.close().catch(() => {})
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    pool: true,            // Connection pooling
    maxConnections: 5,     // Max simultaneous connections
    maxMessages: 100,      // Max messages per connection
    idleTimeout: 30000,    // Close idle connections after 30s
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false, // Allow self-signed certs in dev
    },
  })

  cachedTransporter = transporter
  cachedConfigHash = hash

  return transporter
}

// ─── Load / Save Config ───────────────────────────────────────────────────────────

/**
 * Load SMTP configuration from the PlatformConfig table.
 * Returns null if not configured.
 */
export async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const configs = await db.platformConfig.findMany({
      where: {
        key: { in: Object.values(CONFIG_KEYS) },
      },
    })

    const configMap = new Map(configs.map(c => [c.key, c.value]))

    const host = configMap.get(CONFIG_KEYS.host)
    const port = configMap.get(CONFIG_KEYS.port)
    const secure = configMap.get(CONFIG_KEYS.secure)
    const user = configMap.get(CONFIG_KEYS.user)
    const pass = configMap.get(CONFIG_KEYS.pass)
    const fromName = configMap.get(CONFIG_KEYS.fromName)
    const fromEmail = configMap.get(CONFIG_KEYS.fromEmail)
    const replyTo = configMap.get(CONFIG_KEYS.replyTo)

    if (!host || !user || !pass || !fromEmail) {
      return null
    }

    return {
      host,
      port: parseInt(port || '587', 10),
      secure: secure === 'true',
      user,
      pass,
      fromName: fromName || 'Maellis',
      fromEmail,
      replyTo: replyTo || undefined,
    }
  } catch (error) {
    console.error('[SMTP] Failed to load config:', error)
    return null
  }
}

/**
 * Save SMTP configuration to the PlatformConfig table.
 * Uses upsert to create or update each key.
 */
export async function saveSmtpConfig(config: SmtpConfig): Promise<void> {
  const entries: Array<{ key: string; value: string; type: string; category: string; description: string }> = [
    { key: CONFIG_KEYS.host, value: config.host, type: 'string', category: 'email', description: 'SMTP server hostname' },
    { key: CONFIG_KEYS.port, value: String(config.port), type: 'number', category: 'email', description: 'SMTP server port' },
    { key: CONFIG_KEYS.secure, value: String(config.secure), type: 'boolean', category: 'email', description: 'Use SSL/TLS' },
    { key: CONFIG_KEYS.user, value: config.user, type: 'string', category: 'email', description: 'SMTP username' },
    { key: CONFIG_KEYS.pass, value: config.pass, type: 'string', category: 'email', description: 'SMTP password (encrypted at rest)' },
    { key: CONFIG_KEYS.fromName, value: config.fromName, type: 'string', category: 'email', description: 'Sender display name' },
    { key: CONFIG_KEYS.fromEmail, value: config.fromEmail, type: 'string', category: 'email', description: 'Sender email address' },
    { key: CONFIG_KEYS.replyTo, value: config.replyTo || '', type: 'string', category: 'email', description: 'Reply-To address' },
    { key: CONFIG_KEYS.enabled, value: 'true', type: 'boolean', category: 'email', description: 'SMTP notifications enabled' },
  ]

  for (const entry of entries) {
    await db.platformConfig.upsert({
      where: { key: entry.key },
      create: entry,
      update: { value: entry.value, type: entry.type, category: entry.category, description: entry.description },
    })
  }

  // Invalidate cached transporter so next send uses new config
  if (cachedTransporter) {
    cachedTransporter.close().catch(() => {})
    cachedTransporter = null
    cachedConfigHash = null
  }
}

/**
 * Check if SMTP is enabled and configured.
 */
export async function isSmtpEnabled(): Promise<boolean> {
  try {
    const config = await db.platformConfig.findUnique({
      where: { key: CONFIG_KEYS.enabled },
    })
    return config?.value === 'true'
  } catch {
    return false
  }
}

/**
 * Get SMTP config status (for admin UI) — masks the password.
 */
export async function getSmtpConfigStatus(): Promise<{
  configured: boolean
  enabled: boolean
  host?: string
  port?: number
  secure?: boolean
  user?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
}> {
  const config = await loadSmtpConfig()
  if (!config) {
    return { configured: false, enabled: false }
  }

  const enabled = await isSmtpEnabled()

  return {
    configured: true,
    enabled,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    replyTo: config.replyTo,
  }
}

// ─── Send Email ───────────────────────────────────────────────────────────────────

/**
 * Send an email using the configured SMTP server.
 */
export async function sendEmail(options: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
}): Promise<EmailSendResult> {
  try {
    const config = await loadSmtpConfig()
    if (!config) {
      return { success: false, error: 'SMTP not configured' }
    }

    const enabled = await isSmtpEnabled()
    if (!enabled) {
      return { success: false, error: 'SMTP notifications are disabled' }
    }

    const transporter = getTransporter(config)

    const mailOptions: SendMailOptions = {
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
      replyTo: options.replyTo || config.replyTo,
      attachments: options.attachments,
    }

    const result = await transporter.sendMail(mailOptions)

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error'
    console.error('[SMTP] Send failed:', message)
    return { success: false, error: message }
  }
}

/**
 * Verify SMTP connection by sending a test email.
 */
export async function testSmtpConnection(testEmail: string): Promise<{
  success: boolean
  message: string
  details?: string
}> {
  try {
    const config = await loadSmtpConfig()
    if (!config) {
      return { success: false, message: 'SMTP non configuré' }
    }

    const transporter = getTransporter(config)

    // Verify the connection
    await transporter.verify()

    // Send a test email
    const result = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: testEmail,
      subject: '✅ Maellis — Test de connexion SMTP réussi',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fafafa;">
          <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">M</div>
              <span style="font-size: 20px; font-weight: 600; color: #18181b;">Maellis</span>
            </div>
            <h2 style="color: #10b981; margin-bottom: 12px;">Connexion SMTP réussie ! ✅</h2>
            <p style="color: #6b7280; line-height: 1.6;">
              Votre configuration SMTP fonctionne correctement. Vous recevrez désormais les notifications par email à cette adresse.
            </p>
            <div style="margin-top: 20px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>Serveur :</strong> ${config.host}:${config.port}<br>
                <strong>Expéditeur :</strong> ${config.fromName} &lt;${config.fromEmail}&gt;<br>
                <strong>Sécurisé :</strong> ${config.secure ? 'Oui (SSL/TLS)' : 'Oui (STARTTLS)'}
              </p>
            </div>
            <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; text-align: center;">
              Cet email a été envoyé automatiquement par Maellis. Ne pas répondre.
            </p>
          </div>
        </div>
      `,
      text: 'Connexion SMTP réussie ! Votre configuration fonctionne correctement.',
    })

    return {
      success: true,
      message: 'Email de test envoyé avec succès',
      details: `Message-ID: ${result.messageId}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return {
      success: false,
      message: 'Échec de la connexion SMTP',
      details: message,
    }
  }
}

/**
 * Disable SMTP notifications.
 */
export async function disableSmtp(): Promise<void> {
  await db.platformConfig.upsert({
    where: { key: CONFIG_KEYS.enabled },
    create: { key: CONFIG_KEYS.enabled, value: 'false', type: 'boolean', category: 'email', description: 'SMTP notifications enabled' },
    update: { value: 'false' },
  })
}

/**
 * Enable SMTP notifications.
 */
export async function enableSmtp(): Promise<void> {
  await db.platformConfig.upsert({
    where: { key: CONFIG_KEYS.enabled },
    create: { key: CONFIG_KEYS.enabled, value: 'true', type: 'boolean', category: 'email', description: 'SMTP notifications enabled' },
    update: { value: 'true' },
  })
}
