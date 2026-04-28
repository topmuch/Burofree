/**
 * 2FA Service Layer for Maellis
 * Orchestrates TOTP setup, enable, disable, verification, and backup code management
 */

import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { generateTOTPSecret, verifyTOTP, generateQRCode, generateBackupCodes } from './totp'
import { createAuditLog } from '@/features/security/audit/logger'
import bcrypt from 'bcryptjs'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Setup2FAResult {
  qrCode: string
  secret: string
  backupCodes: string[]
}

interface RegenerateBackupCodesResult {
  backupCodes: string[]
}

// ─── Setup 2FA ───────────────────────────────────────────────────────────────

/**
 * Generate a new TOTP secret, encrypt it, store it in user.twoFactorSecret.
 * Returns QR code, plaintext secret (for manual entry), and backup codes.
 * Does NOT enable 2FA yet — the user must verify with a token first.
 */
export async function setup2FA(
  userId: string,
  email: string
): Promise<Setup2FAResult> {
  // Check if 2FA is already enabled
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })

  if (!user) {
    throw new Error('Utilisateur introuvable.')
  }

  if (user.twoFactorEnabled) {
    throw new Error('La 2FA est déjà activée. Désactivez-la d\'abord pour la reconfigurer.')
  }

  // Generate TOTP secret
  const { secret, otpauthUrl } = generateTOTPSecret(userId, email)

  // Encrypt and store the secret
  const encryptedSecret = encrypt(secret)
  await db.user.update({
    where: { id: userId },
    data: { twoFactorSecret: encryptedSecret },
  })

  // Generate QR code
  const qrCode = await generateQRCode(otpauthUrl)

  // Generate backup codes (plaintext — will be hashed on enable)
  const backupCodes = generateBackupCodes(10)

  return { qrCode, secret, backupCodes }
}

// ─── Enable 2FA ──────────────────────────────────────────────────────────────

/**
 * Verify the first TOTP token, enable 2FA, hash & store backup codes,
 * invalidate all other sessions, and create an audit log entry.
 */
export async function enable2FA(
  userId: string,
  token: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true, email: true },
  })

  if (!user) {
    throw new Error('Utilisateur introuvable.')
  }

  if (user.twoFactorEnabled) {
    throw new Error('La 2FA est déjà activée.')
  }

  if (!user.twoFactorSecret) {
    throw new Error('Veuillez d\'abord configurer la 2FA (setup).')
  }

  // Decrypt the secret and verify the token
  const secret = decrypt(user.twoFactorSecret)
  const isValid = verifyTOTP(secret, token)

  if (!isValid) {
    await createAuditLog({
      userId,
      action: '2fa.enable.failed',
      target: 'user',
      targetId: userId,
      metadata: { reason: 'invalid_token' },
      ip,
      userAgent,
    })
    throw new Error('Code TOTP invalide. Veuillez réessayer.')
  }

  // Generate and hash backup codes
  const backupCodes = generateBackupCodes(10)
  const hashedCodes = await Promise.all(
    backupCodes.map((code) => bcrypt.hash(code, 10))
  )

  // Delete any existing unused backup codes
  await db.backupCode.deleteMany({
    where: { userId, usedAt: null },
  })

  // Store hashed backup codes
  await db.backupCode.createMany({
    data: hashedCodes.map((codeHash) => ({
      codeHash,
      userId,
    })),
  })

  // Enable 2FA
  await db.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  })

  // Invalidate all other sessions (keep current — identified by user agent or IP heuristic)
  // In JWT strategy, we can't directly invalidate sessions server-side easily,
  // but we delete all Session records for this user as a security measure
  await db.session.deleteMany({
    where: { userId },
  })

  // Audit log
  await createAuditLog({
    userId,
    action: '2fa.enable.success',
    target: 'user',
    targetId: userId,
    metadata: { backupCodeCount: backupCodes.length },
    ip,
    userAgent,
  })
}

// ─── Disable 2FA ─────────────────────────────────────────────────────────────

/**
 * Verify TOTP or backup code, then disable 2FA, clear the secret,
 * and create an audit log entry.
 */
export async function disable2FA(
  userId: string,
  token: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })

  if (!user) {
    throw new Error('Utilisateur introuvable.')
  }

  if (!user.twoFactorEnabled) {
    throw new Error('La 2FA n\'est pas activée.')
  }

  // Verify token — either TOTP or backup code
  let isValid = false
  let usedBackupCodeId: string | null = null

  // Try TOTP verification first
  if (user.twoFactorSecret) {
    const secret = decrypt(user.twoFactorSecret)
    isValid = verifyTOTP(secret, token)
  }

  // If TOTP fails, try backup code
  if (!isValid) {
    const unusedCodes = await db.backupCode.findMany({
      where: { userId, usedAt: null },
    })

    for (const backupCode of unusedCodes) {
      const isMatch = await bcrypt.compare(token.toUpperCase(), backupCode.codeHash)
      if (isMatch) {
        isValid = true
        usedBackupCodeId = backupCode.id
        // Mark backup code as used
        await db.backupCode.update({
          where: { id: backupCode.id },
          data: { usedAt: new Date() },
        })
        break
      }
    }
  }

  if (!isValid) {
    await createAuditLog({
      userId,
      action: '2fa.disable.failed',
      target: 'user',
      targetId: userId,
      metadata: { reason: 'invalid_token' },
      ip,
      userAgent,
    })
    throw new Error('Code de vérification invalide. Veuillez réessayer.')
  }

  // Disable 2FA and clear the secret
  await db.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  })

  // Delete all backup codes
  await db.backupCode.deleteMany({
    where: { userId },
  })

  // Audit log
  await createAuditLog({
    userId,
    action: '2fa.disable.success',
    target: 'user',
    targetId: userId,
    metadata: {
      method: usedBackupCodeId ? 'backup_code' : 'totp',
    },
    ip,
    userAgent,
  })
}

// ─── Verify 2FA Token ────────────────────────────────────────────────────────

/**
 * Check if a token is a valid TOTP code or a valid backup code.
 * Returns true if valid. Marks backup codes as used.
 */
export async function verify2FAToken(userId: string, token: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })

  if (!user || !user.twoFactorEnabled) {
    return false
  }

  // Try TOTP verification first
  if (user.twoFactorSecret) {
    const secret = decrypt(user.twoFactorSecret)
    if (verifyTOTP(secret, token)) {
      return true
    }
  }

  // Try backup code verification
  const unusedCodes = await db.backupCode.findMany({
    where: { userId, usedAt: null },
  })

  for (const backupCode of unusedCodes) {
    const isMatch = await bcrypt.compare(token.toUpperCase(), backupCode.codeHash)
    if (isMatch) {
      // Mark backup code as used (single-use)
      await db.backupCode.update({
        where: { id: backupCode.id },
        data: { usedAt: new Date() },
      })
      return true
    }
  }

  return false
}

// ─── Regenerate Backup Codes ─────────────────────────────────────────────────

/**
 * Verify the user's current 2FA, then generate new backup codes
 * and invalidate the old ones.
 */
export async function regenerateBackupCodes(
  userId: string,
  token: string,
  ip?: string,
  userAgent?: string
): Promise<RegenerateBackupCodesResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })

  if (!user) {
    throw new Error('Utilisateur introuvable.')
  }

  if (!user.twoFactorEnabled) {
    throw new Error('La 2FA doit être activée pour régénérer les codes de secours.')
  }

  // Verify current 2FA — only TOTP allowed for regeneration (not backup codes)
  if (!user.twoFactorSecret) {
    throw new Error('Secret 2FA introuvable.')
  }

  const secret = decrypt(user.twoFactorSecret)
  const isValid = verifyTOTP(secret, token)

  if (!isValid) {
    await createAuditLog({
      userId,
      action: '2fa.backup_codes.regenerate.failed',
      target: 'user',
      targetId: userId,
      metadata: { reason: 'invalid_totp' },
      ip,
      userAgent,
    })
    throw new Error('Code TOTP invalide. Seul le code TOTP est accepté pour régénérer les codes de secours.')
  }

  // Delete all existing backup codes
  await db.backupCode.deleteMany({
    where: { userId },
  })

  // Generate new backup codes
  const backupCodes = generateBackupCodes(10)
  const hashedCodes = await Promise.all(
    backupCodes.map((code) => bcrypt.hash(code, 10))
  )

  // Store new hashed backup codes
  await db.backupCode.createMany({
    data: hashedCodes.map((codeHash) => ({
      codeHash,
      userId,
    })),
  })

  // Audit log
  await createAuditLog({
    userId,
    action: '2fa.backup_codes.regenerate.success',
    target: 'user',
    targetId: userId,
    metadata: { backupCodeCount: backupCodes.length },
    ip,
    userAgent,
  })

  return { backupCodes }
}
