/**
 * TOTP Utility Functions for Burozen 2FA
 * Uses otplib v13 for TOTP generation/verification and qrcode for QR code generation
 *
 * otplib v13 API: top-level functions with crypto/base32 plugin contexts
 */

import {
  generateSecret,
  generateSync,
  verifySync,
  generateURI,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'

// ─── Plugin Contexts (singleton) ───────────────────────────────────────────

const cryptoPlugin = new NobleCryptoPlugin()
const base32Plugin = new ScureBase32Plugin()

const context = { crypto: cryptoPlugin, base32: base32Plugin }

// ─── TOTP Functions ────────────────────────────────────────────────────────

/** Generate a new TOTP secret for a user */
export function generateTOTPSecret(userId: string, email: string): {
  secret: string
  otpauthUrl: string
} {
  const secret = generateSecret(context)
  const serviceName = 'Burozen'
  const otpauthUrl = generateURI({
    secret,
    label: email,
    issuer: serviceName,
  })

  return { secret, otpauthUrl }
}

/** Verify a TOTP token against a secret */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    const result = verifySync({ token, secret, ...context })
    return result.valid
  } catch {
    return false
  }
}

/** Generate a current TOTP token (for testing) */
export function generateTOTPToken(secret: string): string {
  return generateSync({ secret, ...context })
}

/** Generate a QR code as a base64 data URL from an otpauth:// URL */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

/** Generate random backup codes (8-character alphanumeric) */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Avoid ambiguous chars (0/O, 1/I/l)

  for (let i = 0; i < count; i++) {
    let code = ''
    const bytes = crypto.randomBytes(8)
    for (let j = 0; j < 8; j++) {
      code += charset[bytes[j] % charset.length]
    }
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  return codes
}
