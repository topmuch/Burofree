/**
 * Team Invitation Manager
 *
 * Handles generating JWT-signed invitation tokens,
 * sending invitation emails via Resend, and processing
 * invitation acceptance/rejection.
 */

import { db } from '@/lib/db'
import { sign, verify } from '@/lib/jwt-simple'
import { hasPermission } from './permissions'
import type { TeamRole } from './permissions'

const INVITE_EXPIRY_DAYS = 7

interface InviteTokenPayload {
  teamId: string
  email: string
  role: TeamRole
  inviterId: string
  iat: number
  exp: number
}

/**
 * Generate a signed invitation token.
 */
function generateInviteToken(
  teamId: string,
  email: string,
  role: TeamRole,
  inviterId: string,
): string {
  const payload: Omit<InviteTokenPayload, 'iat' | 'exp'> = {
    teamId,
    email,
    role,
    inviterId,
  }

  return sign(payload, {
    expiresIn: `${INVITE_EXPIRY_DAYS}d`,
  })
}

/**
 * Verify and decode an invitation token.
 */
function verifyInviteToken(token: string): InviteTokenPayload | null {
  try {
    const payload = verify(token) as InviteTokenPayload
    if (!payload.teamId || !payload.email || !payload.role) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Create a team invitation.
 * Checks inviter permissions and sends email.
 */
export async function createTeamInvitation(
  inviterId: string,
  teamId: string,
  email: string,
  role: TeamRole = 'member',
): Promise<{ success: boolean; error?: string; inviteId?: string }> {
  // Check inviter is a member with invite permission
  const inviterMembership = await db.teamMember.findFirst({
    where: { userId: inviterId, teamId, status: 'active' },
  })

  if (!inviterMembership) {
    return { success: false, error: 'Vous n\'êtes pas membre de cette équipe' }
  }

  if (!hasPermission(inviterMembership.role as TeamRole, 'team.members.invite')) {
    return { success: false, error: 'Vous n\'avez pas la permission d\'inviter des membres' }
  }

  // Check team member limit
  const team = await db.team.findUnique({ where: { id: teamId } })
  if (!team) return { success: false, error: 'Équipe non trouvée' }

  const memberCount = await db.teamMember.count({
    where: { teamId, status: { in: ['active', 'invited'] } },
  })

  if (memberCount >= team.maxMembers) {
    return { success: false, error: `Limite de membres atteinte (${team.maxMembers}). Mettez à niveau votre plan.` }
  }

  // Check if already a member
  const existingMember = await db.teamMember.findFirst({
    where: { teamId, userId: inviterId },
  })

  // Check if user exists
  const existingUser = await db.user.findUnique({ where: { email } })

  // Check if already invited
  const existingInvite = await db.teamMember.findFirst({
    where: {
      teamId,
      user: { email },
      status: 'invited',
    },
  })

  if (existingInvite) {
    return { success: false, error: 'Cet email a déjà été invité' }
  }

  if (existingMember && existingMember.status === 'active') {
    return { success: false, error: 'Cet utilisateur est déjà membre' }
  }

  // Generate invitation token
  const token = generateInviteToken(teamId, email, role, inviterId)

  // Create or find user, then create TeamMember with invited status
  let userId: string
  if (existingUser) {
    userId = existingUser.id
  } else {
    // Create a placeholder user (will complete onboarding later)
    const newUser = await db.user.create({
      data: {
        email,
        name: email.split('@')[0],
        onboardingDone: false,
      },
    })
    userId = newUser.id
  }

  // Create team membership
  const membership = await db.teamMember.create({
    data: {
      userId,
      teamId,
      role,
      status: 'invited',
      invitedAt: new Date(),
    },
  })

  // Send invitation email via Resend
  await sendInvitationEmail(email, team.name, token, inviterId)

  // Audit log
  await db.auditLog.create({
    data: {
      teamId,
      userId: inviterId,
      action: 'team.member.invite',
      target: 'user',
      targetId: userId,
      metadata: JSON.stringify({ email, role }),
    },
  })

  return { success: true, inviteId: membership.id }
}

/**
 * Accept a team invitation.
 */
export async function acceptInvitation(
  userId: string,
  token: string,
): Promise<{ success: boolean; error?: string; teamId?: string }> {
  const payload = verifyInviteToken(token)
  if (!payload) {
    return { success: false, error: 'Invitation invalide ou expirée' }
  }

  // Verify user matches the invited email
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.email !== payload.email) {
    return { success: false, error: 'Cette invitation ne vous est pas destinée' }
  }

  // Update membership status
  const membership = await db.teamMember.findFirst({
    where: {
      teamId: payload.teamId,
      user: { email: payload.email },
      status: 'invited',
    },
  })

  if (!membership) {
    return { success: false, error: 'Invitation non trouvée' }
  }

  await db.teamMember.update({
    where: { id: membership.id },
    data: {
      status: 'active',
      joinedAt: new Date(),
      role: payload.role,
    },
  })

  // Audit log
  await db.auditLog.create({
    data: {
      teamId: payload.teamId,
      userId,
      action: 'team.member.accept',
      target: 'team',
      targetId: payload.teamId,
      metadata: JSON.stringify({ role: payload.role }),
    },
  })

  return { success: true, teamId: payload.teamId }
}

/**
 * Decline a team invitation.
 */
export async function declineInvitation(
  userId: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const payload = verifyInviteToken(token)
  if (!payload) {
    return { success: false, error: 'Invitation invalide ou expirée' }
  }

  const membership = await db.teamMember.findFirst({
    where: {
      teamId: payload.teamId,
      user: { email: payload.email },
      status: 'invited',
    },
  })

  if (!membership) {
    return { success: false, error: 'Invitation non trouvée' }
  }

  await db.teamMember.update({
    where: { id: membership.id },
    data: { status: 'removed' },
  })

  await db.auditLog.create({
    data: {
      teamId: payload.teamId,
      userId,
      action: 'team.member.decline',
      target: 'team',
      targetId: payload.teamId,
    },
  })

  return { success: true }
}

/**
 * Send invitation email via Resend API.
 */
async function sendInvitationEmail(
  email: string,
  teamName: string,
  token: string,
  inviterId: string,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('[TeamInvite] RESEND_API_KEY not set — skipping email')
    return
  }

  const inviter = await db.user.findUnique({ where: { id: inviterId } })
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const acceptUrl = `${origin}/api/teams/accept?token=${token}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Burofree <noreply@burofree.com>',
        to: email,
        subject: `${inviter?.name || 'Quelqu\'un'} vous a invité à rejoindre ${teamName} sur Burofree`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981; font-size: 24px;">Invitation à rejoindre une équipe</h1>
            <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6;">
              <strong>${inviter?.name || 'Un utilisateur'}</strong> vous a invité à rejoindre
              l'équipe <strong>${teamName}</strong> sur Burofree.
            </p>
            <a href="${acceptUrl}"
               style="display: inline-block; background: #10b981; color: white; padding: 12px 24px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
              Accepter l'invitation
            </a>
            <p style="color: #71717a; font-size: 14px;">
              Cette invitation expire dans ${INVITE_EXPIRY_DAYS} jours.
              Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      console.error('[TeamInvite] Email send failed:', await response.text())
    }
  } catch (error) {
    console.error('[TeamInvite] Email error:', error)
  }
}
