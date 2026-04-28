/**
 * Adapter Registry for the Unified Inbox.
 * Singleton registry that maps provider → adapter instance.
 * Manages adapter lifecycle (creation, caching, cleanup).
 */

import type { ChannelAdapter, ProviderType } from './types'
import { GmailAdapter } from './gmail-adapter'
import { OutlookAdapter } from './outlook-adapter'
import { db } from '@/lib/db'

/** Cache key format: userId:provider */
type CacheKey = `${string}:${ProviderType}`

/**
 * Adapter Registry — manages channel adapter instances per user.
 * Adapters are cached and reused for the same user+provider combination.
 */
class AdapterRegistry {
  private adapters = new Map<CacheKey, ChannelAdapter>()

  /**
   * Get or create an adapter for a user and provider.
   * Returns a cached adapter if available, otherwise creates a new one.
   * @param userId - The user's ID
   * @param provider - The channel provider type
   * @returns The channel adapter instance (connected)
   */
  async getAdapter(userId: string, provider: ProviderType): Promise<ChannelAdapter> {
    const cacheKey: CacheKey = `${userId}:${provider}`

    // Return cached adapter if available
    const cached = this.adapters.get(cacheKey)
    if (cached) return cached

    // Find the ChannelAccount for this user+provider
    const account = await db.channelAccount.findFirst({
      where: { userId, provider, isActive: true },
    })

    if (!account) {
      throw new Error(`No active ${provider} account found for user ${userId}`)
    }

    // Create adapter based on provider
    const adapter = this.createAdapter(userId, provider, account.id)

    // Connect the adapter
    await adapter.connect()

    // Cache the adapter
    this.adapters.set(cacheKey, adapter)

    return adapter
  }

  /**
   * Manually register an adapter instance.
   * Useful for testing or custom adapter configurations.
   * @param provider - The channel provider type
   * @param adapter - The adapter instance to register
   */
  registerAdapter(userId: string, provider: ProviderType, adapter: ChannelAdapter): void {
    const cacheKey: CacheKey = `${userId}:${provider}`
    this.adapters.set(cacheKey, adapter)
  }

  /**
   * Disconnect and remove all adapters for a specific user.
   * Should be called on user logout or session end.
   * @param userId - The user's ID
   */
  async disconnectAll(userId: string): Promise<void> {
    const userPrefix = `${userId}:`
    const keysToRemove: CacheKey[] = []

    for (const [key, adapter] of this.adapters.entries()) {
      if (key.startsWith(userPrefix)) {
        try {
          await adapter.disconnect()
        } catch {
          // Ignore disconnect errors during cleanup
        }
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      this.adapters.delete(key)
    }
  }

  /**
   * Disconnect and remove a specific adapter for a user+provider combination.
   * @param userId - The user's ID
   * @param provider - The channel provider type
   */
  async disconnectAdapter(userId: string, provider: ProviderType): Promise<void> {
    const cacheKey: CacheKey = `${userId}:${provider}`
    const adapter = this.adapters.get(cacheKey)
    if (adapter) {
      try {
        await adapter.disconnect()
      } catch {
        // Ignore disconnect errors
      }
      this.adapters.delete(cacheKey)
    }
  }

  /**
   * Create a new adapter instance based on the provider type.
   * @param userId - The user's ID
   * @param provider - The channel provider type
   * @param channelAccountId - The ChannelAccount ID
   * @returns A new (unconnected) adapter instance
   */
  private createAdapter(userId: string, provider: ProviderType, channelAccountId: string): ChannelAdapter {
    switch (provider) {
      case 'gmail':
        return new GmailAdapter(userId, channelAccountId)
      case 'outlook':
        return new OutlookAdapter(userId, channelAccountId)
      case 'whatsapp':
        // Future: WhatsAppAdapter
        throw new Error(`WhatsApp adapter not yet implemented`)
      case 'twilio':
        // Future: TwilioAdapter
        throw new Error(`Twilio adapter not yet implemented`)
      case 'slack':
        // Future: SlackAdapter
        throw new Error(`Slack adapter not yet implemented`)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }
}

/** Singleton instance of the Adapter Registry */
export const adapterRegistry = new AdapterRegistry()
