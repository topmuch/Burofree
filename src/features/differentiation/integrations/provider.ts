export interface IntegrationProvider {
  name: string
  slug: string
  connect(userId: string, code: string, redirectUri?: string): Promise<ConnectionResult>
  disconnect(userId: string): Promise<void>
  sync(userId: string): Promise<SyncResult>
  healthCheck(userId: string): Promise<HealthResult>
}

export interface ConnectionResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: Date
  scopes?: string[]
  metadata?: Record<string, unknown>
  error?: string
}

export interface SyncResult {
  success: boolean
  itemsProcessed?: number
  error?: string
}

export interface HealthResult {
  status: 'connected' | 'expired' | 'error'
  message?: string
}

// Provider registry
const providers: Map<string, IntegrationProvider> = new Map()

export function registerProvider(provider: IntegrationProvider) {
  providers.set(provider.slug, provider)
}

export function getProvider(slug: string): IntegrationProvider | undefined {
  return providers.get(slug)
}

export function getAllProviders(): IntegrationProvider[] {
  return Array.from(providers.values())
}

// ─── Stub providers for demo ────────────────────────────────────────────────────

class SlackProvider implements IntegrationProvider {
  name = 'Slack'
  slug = 'slack'

  async connect(userId: string, code: string, redirectUri?: string): Promise<ConnectionResult> {
    // For now, simulate a successful connection
    void userId; void code; void redirectUri
    return {
      success: true,
      accessToken: 'slack-access-token-demo',
      refreshToken: 'slack-refresh-token-demo',
      tokenExpiry: new Date(Date.now() + 3600 * 1000),
      scopes: ['channels:read', 'chat:write', 'users:read'],
      metadata: { teamId: 'T_DEMO', teamName: 'Maellis Workspace' },
    }
  }

  async disconnect(userId: string): Promise<void> {
    void userId
  }

  async sync(userId: string): Promise<SyncResult> {
    void userId
    return { success: true, itemsProcessed: 0 }
  }

  async healthCheck(userId: string): Promise<HealthResult> {
    void userId
    return { status: 'connected', message: 'Slack connecté' }
  }
}

class ZoomProvider implements IntegrationProvider {
  name = 'Zoom'
  slug = 'zoom'

  async connect(userId: string, code: string, redirectUri?: string): Promise<ConnectionResult> {
    void userId; void code; void redirectUri
    return {
      success: true,
      accessToken: 'zoom-access-token-demo',
      refreshToken: 'zoom-refresh-token-demo',
      tokenExpiry: new Date(Date.now() + 3600 * 1000),
      scopes: ['meeting:read', 'meeting:write'],
      metadata: { accountId: 'ACC_DEMO' },
    }
  }

  async disconnect(userId: string): Promise<void> {
    void userId
  }

  async sync(userId: string): Promise<SyncResult> {
    void userId
    return { success: true, itemsProcessed: 0 }
  }

  async healthCheck(userId: string): Promise<HealthResult> {
    void userId
    return { status: 'connected', message: 'Zoom connecté' }
  }
}

class GoogleDriveProvider implements IntegrationProvider {
  name = 'Google Drive'
  slug = 'google_drive'

  async connect(userId: string, code: string, redirectUri?: string): Promise<ConnectionResult> {
    void userId; void code; void redirectUri
    return {
      success: true,
      accessToken: 'gdrive-access-token-demo',
      refreshToken: 'gdrive-refresh-token-demo',
      tokenExpiry: new Date(Date.now() + 3600 * 1000),
      scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'],
      metadata: { email: 'user@gmail.com' },
    }
  }

  async disconnect(userId: string): Promise<void> {
    void userId
  }

  async sync(userId: string): Promise<SyncResult> {
    void userId
    return { success: true, itemsProcessed: 0 }
  }

  async healthCheck(userId: string): Promise<HealthResult> {
    void userId
    return { status: 'connected', message: 'Google Drive connecté' }
  }
}

class GitHubProvider implements IntegrationProvider {
  name = 'GitHub'
  slug = 'github'

  async connect(userId: string, code: string, redirectUri?: string): Promise<ConnectionResult> {
    void userId; void code; void redirectUri
    return {
      success: true,
      accessToken: 'github-access-token-demo',
      scopes: ['repo', 'read:org'],
      metadata: { login: 'demo-user' },
    }
  }

  async disconnect(userId: string): Promise<void> {
    void userId
  }

  async sync(userId: string): Promise<SyncResult> {
    void userId
    return { success: true, itemsProcessed: 0 }
  }

  async healthCheck(userId: string): Promise<HealthResult> {
    void userId
    return { status: 'connected', message: 'GitHub connecté' }
  }
}

class NotionProvider implements IntegrationProvider {
  name = 'Notion'
  slug = 'notion'

  async connect(userId: string, code: string, redirectUri?: string): Promise<ConnectionResult> {
    void userId; void code; void redirectUri
    return {
      success: true,
      accessToken: 'notion-access-token-demo',
      scopes: ['read_content', 'write_content'],
      metadata: { workspaceId: 'WS_DEMO', workspaceName: 'Mon Workspace' },
    }
  }

  async disconnect(userId: string): Promise<void> {
    void userId
  }

  async sync(userId: string): Promise<SyncResult> {
    void userId
    return { success: true, itemsProcessed: 0 }
  }

  async healthCheck(userId: string): Promise<HealthResult> {
    void userId
    return { status: 'connected', message: 'Notion connecté' }
  }
}

// Register all providers
registerProvider(new SlackProvider())
registerProvider(new ZoomProvider())
registerProvider(new GoogleDriveProvider())
registerProvider(new GitHubProvider())
registerProvider(new NotionProvider())
