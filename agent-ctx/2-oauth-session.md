# Task 2 — OAuth + Session Provider System

## Summary

Implemented a comprehensive OAuth and Session Provider system for Maellis, enhancing authentication with token encryption, auto-refresh, and proper session management.

## Files Created

1. **`src/lib/crypto.ts`** — Token encryption utility using AES-256-GCM
   - `encrypt(text)` — Encrypts plaintext with AES-256-GCM, returns base64
   - `decrypt(encrypted)` — Decrypts base64-encoded ciphertext back to plaintext
   - `isEncrypted(value)` — Utility to check if a value is encrypted
   - Uses `ENCRYPTION_KEY` env var with scrypt key derivation
   - Dev fallback key when ENCRYPTION_KEY is not set

2. **`src/lib/token-refresh.ts`** — Server-side token refresh utility
   - `getFreshAccessToken(userId, provider)` — Gets decrypted access token, auto-refreshes if expired
   - `getAllFreshTokens(userId)` — Gets fresh tokens for all user's email accounts
   - Handles Google and Microsoft token refresh flows
   - Updates DB with new encrypted tokens after refresh
   - 5-minute buffer before expiry to proactively refresh

3. **`src/components/providers/session-provider.tsx`** — NextAuth SessionProvider wrapper
   - Wraps app with NextAuth SessionProvider (5-min refetch interval)
   - `SessionSync` inner component syncs auth state to Zustand store
   - Sets user data in store on authentication
   - Triggers fetchAll/fetchUser based on onboarding status
   - Clears user data on unauthentication

4. **`src/middleware.ts`** — Token refresh middleware
   - Intercepts `/api/emails`, `/api/email-sync`, `/api/calendar` routes
   - Adds `x-session-token-present` and `x-needs-token-refresh` headers
   - Edge Runtime compatible (no Node.js crypto or Prisma)
   - Actual refresh handled by server-side `token-refresh.ts` utility

5. **`.env.example`** — Environment variable template
   - Google OAuth, Microsoft OAuth, NextAuth, ENCRYPTION_KEY, DATABASE_URL
   - Public configuration flags for client-side OAuth detection

## Files Modified

6. **`prisma/schema.prisma`** — Added Account and Session models + EmailAccount fields
   - New `Account` model: NextAuth adapter pattern with provider, tokens, scopes
   - New `Session` model: NextAuth session tracking
   - Added `accounts Account[]` and `sessions Session[]` to User model
   - Added `tokenExpiry DateTime?` and `scopes String?` to EmailAccount model

7. **`src/app/api/auth/[...nextauth]/route.ts`** — Enhanced NextAuth configuration
   - Dynamic provider registration: only adds Google/Azure if credentials configured
   - Encrypted token storage: all tokens encrypted before DB storage
   - Account model upsert: maintains NextAuth adapter pattern
   - JWT callback: stores tokens with expiry tracking, auto-refresh on expiry
   - Session callback: exposes userId, onboardingDone, emailAccounts
   - Token refresh: automatic refresh with 5-min buffer, DB updates on refresh
   - Graceful fallback: if refresh fails, keeps existing token

8. **`src/types/next-auth.d.ts`** — Extended NextAuth type declarations
   - Session.user now includes `id`, `onboardingDone`
   - Session includes optional `emailAccounts` array
   - JWT includes `provider`, `accessTokenExpires`, `userId`

9. **`src/lib/store.ts`** — Updated Zustand store
   - EmailAccount interface: added `tokenExpiry` and `scopes` fields
   - New `setUser(user)` action for SessionProvider to sync auth state

10. **`src/app/layout.tsx`** — Wrapped with SessionProvider
    - Imported and wrapped `{children}` with `<SessionProvider>`
    - Toaster remains outside the provider

11. **`.env`** — Added ENCRYPTION_KEY variable

## Technical Decisions

- **Edge Runtime compatibility**: Middleware uses only Web APIs, token refresh logic moved to server-side utility
- **AES-256-GCM encryption**: Industry-standard for token encryption at rest
- **Scrypt key derivation**: Derives 32-byte key from ENCRYPTION_KEY env var with salt
- **5-minute refresh buffer**: Proactively refreshes tokens before they expire
- **Conditional OAuth providers**: Only registers Google/Azure providers when credentials are configured
- **Backward compatible**: App works in demo mode without real OAuth credentials
