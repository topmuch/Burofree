/**
 * TOTP Utility Functions for Burofree 2FA
 * Uses otplib for TOTP generation/verification and qrcode for QR code generation
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'

/** Generate a new TOTP secret for a user */
export function generateTOTPSecret(userId: string, email: string): {
  secret: string
  otpauthUrl: string
} {
  const secret = authenticator.generateSecret()
  const serviceName = encodeURIComponent('Burofree')
  const userEmail = encodeURIComponent(email)
  const otpauthUrl = authenticator.keyuri(userEmail, serviceName, secret)

  return { secret, otpauthUrl }
}

/** Verify a TOTP token against a secret */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    return authenticator.verify(token, secret)
  } catch {
    return false
  }
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
