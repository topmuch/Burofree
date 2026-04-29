import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export type ModuleSlug =
  | 'focus-mode'
  | 'client-portal'
  | 'slack-integration'
  | 'zoom-integration'
  | 'google-drive-integration'
  | 'github-integration'
  | 'notion-integration'
  | 'voice-commands'
  | 'marketplace'

// Free modules that don't require subscription
const FREE_MODULES: ModuleSlug[] = ['marketplace', 'focus-mode', 'voice-commands']

export interface EntitlementResult {
  entitled: boolean
  status: 'active' | 'trial' | 'inactive' | 'expired' | 'free'
  expiresAt: Date | null
  moduleId: string | null
}

/**
 * Check if a user has access to a specific module.
 * Call this from API routes or Server Components.
 */
export async function checkEntitlement(userId: string, moduleSlug: ModuleSlug): Promise<EntitlementResult> {
  // Free modules are always available
  if (FREE_MODULES.includes(moduleSlug)) {
    return { entitled: true, status: 'free', expiresAt: null, moduleId: null }
  }

  const userModule = await db.userModule.findFirst({
    where: { userId, module: { slug: moduleSlug } },
    include: { module: true },
  })

  if (!userModule) {
    return { entitled: false, status: 'inactive', expiresAt: null, moduleId: null }
  }

  // Check expiration
  if (userModule.expiresAt && userModule.expiresAt < new Date()) {
    // Auto-update status to expired
    await db.userModule.update({
      where: { id: userModule.id },
      data: { status: 'expired' },
    })
    return { entitled: false, status: 'expired', expiresAt: userModule.expiresAt, moduleId: userModule.moduleId }
  }

  // Check if trial is still valid
  if (userModule.status === 'trial' && userModule.trialEndsAt && userModule.trialEndsAt < new Date()) {
    await db.userModule.update({
      where: { id: userModule.id },
      data: { status: 'expired' },
    })
    return { entitled: false, status: 'expired', expiresAt: userModule.trialEndsAt, moduleId: userModule.moduleId }
  }

  const entitled = userModule.status === 'active' || userModule.status === 'trial'
  return {
    entitled,
    status: userModule.status as EntitlementResult['status'],
    expiresAt: userModule.expiresAt,
    moduleId: userModule.moduleId,
  }
}

/**
 * Server Component helper: require entitlement or return null.
 * Use in Server Components to conditionally render module features.
 */
export async function requireEntitlement(moduleSlug: ModuleSlug): Promise<EntitlementResult> {
  const { user } = await requireAuth()
  if (!user) return { entitled: false, status: 'inactive', expiresAt: null, moduleId: null }
  return checkEntitlement(user.id, moduleSlug)
}

/**
 * Get all active modules for a user
 */
export async function getUserModules(userId: string) {
  return db.userModule.findMany({
    where: { userId, status: { in: ['active', 'trial'] } },
    include: { module: true },
    orderBy: { createdAt: 'desc' },
  })
}
