// Auth utilities for Maellis
// In production, replace mock credentials with real OAuth keys

export const AUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    scopes: [
      'openid', 'email', 'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  },
  microsoft: {
    clientId: process.env.AZURE_AD_CLIENT_ID || '',
    configured: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
    scopes: ['openid', 'email', 'profile', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite', 'offline_access'],
  },
}

export function isOAuthConfigured(provider: 'google' | 'microsoft'): boolean {
  return AUTH_CONFIG[provider].configured
}
