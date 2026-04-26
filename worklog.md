# Task 2 — OAuth + Session Provider System

## Summary

Implemented a comprehensive OAuth and Session Provider system for Maellis with token encryption, auto-refresh, and proper session management.

### 1. Token Encryption Utility
- **File**: `src/lib/crypto.ts` — AES-256-GCM encryption for OAuth tokens
  - `encrypt(text)` / `decrypt(encrypted)` — Encrypt/decrypt tokens for DB storage
  - Uses `ENCRYPTION_KEY` env var with scrypt key derivation (dev fallback)
  - `isEncrypted(value)` — Utility check for encrypted values

### 2. Enhanced NextAuth Configuration
- **File**: `src/app/api/auth/[...nextauth]/route.ts` — Complete auth overhaul
  - Conditional provider registration (Google/Azure only if credentials set)
  - Encrypted token storage in DB via crypto.ts
  - Account model upsert following NextAuth adapter pattern
  - JWT callback with token expiry tracking and auto-refresh (5-min buffer)
  - Session callback exposes userId, onboardingDone, emailAccounts
  - Automatic token refresh with DB updates on success

### 3. Session Provider Wrapper
- **File**: `src/components/providers/session-provider.tsx` — NextAuth SessionProvider wrapper
  - Wraps app with SessionProvider (5-min refetch, refetchOnWindowFocus)
  - SessionSync component syncs auth state to Zustand store
  - Handles loading, authenticated, and unauthenticated states
  - Auto-triggers fetchAll/fetchUser based on onboarding status

### 4. Token Refresh Middleware
- **File**: `src/middleware.ts` — Edge-compatible middleware
  - Intercepts `/api/emails`, `/api/email-sync`, `/api/calendar` routes
  - Adds session-aware headers for downstream route handlers
- **File**: `src/lib/token-refresh.ts` — Server-side token refresh utility
  - `getFreshAccessToken(userId, provider)` — Auto-refreshes expired tokens
  - `getAllFreshTokens(userId)` — Fresh tokens for all user accounts
  - Updates DB with new encrypted tokens after refresh

### 5. Prisma Schema Updates
- Added `Account` model (NextAuth adapter pattern)
- Added `Session` model (NextAuth session tracking)
- Added `tokenExpiry` (DateTime?) and `scopes` (String?) to EmailAccount
- Added `accounts Account[]` and `sessions Session[]` to User model

### 6. Layout & Environment Updates
- **File**: `src/app/layout.tsx` — Wrapped children with SessionProvider
- **File**: `src/types/next-auth.d.ts` — Extended types for session/JWT
- **File**: `.env.example` — Template with all OAuth variables
- **File**: `src/lib/store.ts` — Added setUser action, updated EmailAccount type

## Technical Details
- Edge Runtime compatible middleware (no Node.js crypto/Prisma in middleware)
- Backward compatible — app works in demo mode without real OAuth credentials
- AES-256-GCM with scrypt key derivation for token encryption
- 5-minute proactive refresh buffer before token expiry
- Lint passes with 0 errors, 0 warnings

## Files Created
- `src/lib/crypto.ts` (new)
- `src/lib/token-refresh.ts` (new)
- `src/components/providers/session-provider.tsx` (new)
- `src/middleware.ts` (new)
- `.env.example` (new)

## Files Modified
- `prisma/schema.prisma` (Account, Session models, EmailAccount fields)
- `src/app/api/auth/[...nextauth]/route.ts` (complete rewrite)
- `src/types/next-auth.d.ts` (extended session/JWT types)
- `src/lib/store.ts` (setUser action, EmailAccount type update)
- `src/app/layout.tsx` (SessionProvider wrapper)
- `.env` (added ENCRYPTION_KEY)

---

# Task 3 — Onboarding Wizard, PDF Invoice Generation, and PWA Setup

## Summary

Implemented three major features for the Maellis freelance assistant application:

### Feature 1: Onboarding Wizard
- **File**: `src/components/onboarding-wizard.tsx` — Full 7-step wizard with Framer Motion animations
  - Step 1: Bienvenue — Large "M" logo with emerald gradient, welcome message
  - Step 2: Votre profil — Name input + profession select (7 options)
  - Step 3: Votre assistant — Assistant name, tone selection (3 cards: Professionnel/Amical/Minimaliste), live preview
  - Step 4: Vos projets — Dynamic project cards (name, client, budget), add/remove, skip option
  - Step 5: Connexion email — Google & Microsoft buttons with "Non configuré" badges, "Configurer plus tard" option
  - Step 6: Vos préférences — Notifications (in-app/email checkboxes), work hours (time inputs), work days (day toggle buttons)
  - Step 7: Terminé — Celebration animation, summary recap, "Accéder au dashboard" button
- **File**: `src/app/api/onboarding/route.ts` — POST endpoint saves user profile data and creates projects, sets onboardingDone=true
- **File**: `src/app/api/users/route.ts` — GET endpoint to fetch user data
- **File**: `src/lib/store.ts` — Added `fetchUser` action, integrated into `fetchAll`
- **File**: `src/app/page.tsx` — Checks `user.onboardingDone`, shows wizard if false, registers service worker

### Feature 2: PDF Invoice Generation
- **File**: `src/app/api/invoices/[id]/pdf/route.ts` — GET endpoint generates professional HTML invoice styled for print
  - Displays: invoice type (Facture/Devis), number, date, émetteur/client info, line items table, totals with TVA, due date, notes
  - Professional styling with emerald accent color, print-friendly layout
- **File**: `src/components/invoicing-panel.tsx` — Added Printer icon button in action column + "Voir / Imprimer PDF" button in invoice detail dialog

### Feature 3: PWA Setup
- **File**: `public/manifest.json` — PWA manifest with Maellis branding, emerald theme, standalone display
- **File**: `public/sw.js` — Basic service worker with cache-first strategy
- **File**: `src/app/layout.tsx` — Added manifest link, theme-color meta, apple-mobile-web-app meta tags
- **File**: `src/app/page.tsx` — Service worker registration in useEffect

## Technical Details
- All UI text in French
- Emerald (#10b981) and amber (#f59e0b) accent colors only — no blue/indigo
- Framer Motion AnimatePresence for step transitions
- shadcn/ui components: Dialog, Button, Input, Select, Checkbox, Progress, Card, Label
- Zustand store extended with fetchUser action
- Lint passes with 0 errors, 0 warnings

## Files Modified
- `src/components/onboarding-wizard.tsx` (new)
- `src/app/api/onboarding/route.ts` (new)
- `src/app/api/users/route.ts` (new)
- `src/app/api/invoices/[id]/pdf/route.ts` (new)
- `public/manifest.json` (new)
- `public/sw.js` (new)
- `src/components/invoicing-panel.tsx` (modified — added PDF button)
- `src/app/layout.tsx` (modified — PWA meta tags)
- `src/app/page.tsx` (modified — onboarding check, service worker)
- `src/lib/store.ts` (modified — fetchUser action)

---

# Task 4 — Google API Integration for Gmail and Google Calendar Sync

## Summary

Implemented comprehensive Google API integration for Gmail and Google Calendar synchronization, enabling the Maellis app to import emails and calendar events from connected Google accounts with deduplication, categorization, and two-way sync support.

### 1. Prisma Schema Updates
- **File**: `prisma/schema.prisma`
  - Added `sourceId` (String?, @unique) to CalendarEvent — Google/Microsoft event ID for deduplication
  - Added `sourceId` (String?, @unique) to Email — Gmail message ID for deduplication
  - Added `gmailHistoryId` (String?) to EmailAccount — last Gmail history ID for incremental sync
- Ran `npx prisma db push --accept-data-loss` to sync schema changes

### 2. Google API Client Library
- **File**: `src/lib/google.ts` — Comprehensive Google API client
  - **Gmail Functions**:
    - `fetchGmailEmails(accountId, maxResults?, pageToken?)` — Fetch emails with full message parsing, base64url decoding, header extraction
    - `sendGmailEmail(accountId, to, subject, body)` — Send emails via Gmail API with RFC 2822 message construction
    - `markGmailEmailRead(accountId, messageId)` — Remove UNREAD label
    - `deleteGmailEmail(accountId, messageId)` — Move to trash
  - **Calendar Functions**:
    - `fetchGoogleCalendarEvents(accountId, timeMin?, timeMax?)` — Fetch events with date/time parsing
    - `createGoogleCalendarEvent(accountId, event)` — Create events (supports all-day and timed)
    - `updateGoogleCalendarEvent(accountId, eventId, event)` — Partial update support
    - `deleteGoogleCalendarEvent(accountId, eventId)` — Delete events (handles 204/410)
  - Uses `getFreshAccessToken()` from token-refresh.ts for auto token refresh
  - Handles token decryption via crypto.ts transparently
  - Processes messages in batches of 10 to avoid rate limiting
  - Exports typed interfaces: `GoogleMessage`, `GoogleCalendarEvent`, `CalendarEventInput`

### 3. Gmail Sync API Route
- **File**: `src/app/api/emails/sync/route.ts` — GET endpoint
  - Fetches emails from connected Gmail account via `fetchGmailEmails()`
  - Deduplication by checking `sourceId` (Gmail message ID) against existing emails
  - Heuristic email categorization:
    - `client` — Default for personal/direct emails
    - `newsletter` — Detected via unsubscribe, no-reply, mailing patterns
    - `admin` — System notifications, automated messages
    - `spam` — Detected via common spam patterns
  - Supports pagination with `pageToken` for batch imports
  - Updates `gmailHistoryId` after successful sync
  - Returns count of imported, skipped emails + nextPageToken
  - Graceful error handling — returns 400 if no account connected, 501 for unsupported providers

### 4. Calendar Sync API Route
- **File**: `src/app/api/calendar/sync/route.ts` — GET + POST endpoints
  - **GET**: Fetches Google Calendar events and syncs to local DB
    - Deduplication using `sourceId` (Google Calendar event ID)
    - Two-way sync: detects changes by comparing title, description, dates, location, allDay
    - Updates existing events when remote changes detected
    - Default range: 1 month ago to 3 months ahead
    - Returns synced, updated, and skipped counts
  - **POST**: Pushes a local event to Google Calendar
    - Creates event remotely via `createGoogleCalendarEvent()`
    - Stores Google event ID as `sourceId` for future sync
    - Prevents re-pushing already synced events

### 5. Email Sync Button Component
- **File**: `src/components/email-sync-button.tsx`
  - Triggers Gmail/Outlook sync on click
  - Shows animated spinner during sync (RefreshCw with animate-spin)
  - Displays count badge (+N) after successful import
  - CheckCircle2 icon on success, Inbox icon when no account connected
  - Toast notifications for success/info/error states
  - Refreshes store (emails + emailAccounts) after sync
  - Graceful fallback when no email account is connected

### 6. Calendar Sync Button Component
- **File**: `src/components/calendar-sync-button.tsx`
  - Triggers Google Calendar sync on click
  - Shows animated spinner during sync
  - Displays combined synced+updated count badge (+N)
  - CheckCircle2 icon on success, CalendarOff icon when no account connected
  - Toast notifications for success/info/error states
  - Refreshes store (events) after sync
  - Auto-sets 3-month sync range

### 7. UI Integration
- **File**: `src/components/email-inbox.tsx` — Added EmailSyncButton next to "Nouvel email" button
  - Added Gmail source badge on emails that have `sourceId`
- **File**: `src/components/calendar-view.tsx` — Added CalendarSyncButton next to "Nouvel événement" button
  - Added Google source badge on events with `source === 'google'`

### 8. Store & API Updates
- **File**: `src/lib/store.ts` — Updated types:
  - CalendarEvent: added `sourceId: string | null`
  - Email: added `sourceId: string | null`
  - EmailAccount: added `gmailHistoryId: string | null`
- **File**: `src/app/api/events/route.ts` — Added sourceId to event creation
- **File**: `src/app/api/events/[id]/route.ts` — Added sourceId to event update
- **File**: `src/app/api/emails/route.ts` — Added sourceId to email creation

## Technical Details
- Uses standard `fetch()` for all Google API calls (no googleapis npm package)
- Gmail API endpoints: `https://gmail.googleapis.com/gmail/v1/users/me/...`
- Calendar API endpoints: `https://www.googleapis.com/calendar/v3/calendars/primary/...`
- Base64url decoding for Gmail message bodies
- Batch processing (10 concurrent) for Gmail message fetching
- 1-minute date comparison tolerance for calendar change detection
- All UI text in French
- Lint passes with 0 errors, 0 warnings

## Files Created
- `src/lib/google.ts` (new — Google API client library)
- `src/app/api/emails/sync/route.ts` (new — Gmail sync endpoint)
- `src/app/api/calendar/sync/route.ts` (new — Calendar sync endpoint)
- `src/components/email-sync-button.tsx` (new — Email sync UI component)
- `src/components/calendar-sync-button.tsx` (new — Calendar sync UI component)

## Files Modified
- `prisma/schema.prisma` (added sourceId to CalendarEvent & Email, gmailHistoryId to EmailAccount)
- `src/lib/store.ts` (updated CalendarEvent, Email, EmailAccount types)
- `src/components/email-inbox.tsx` (added EmailSyncButton, Gmail badge)
- `src/components/calendar-view.tsx` (added CalendarSyncButton, Google badge)
- `src/app/api/events/route.ts` (added sourceId to creation)
- `src/app/api/events/[id]/route.ts` (added sourceId to update)
- `src/app/api/emails/route.ts` (added sourceId to creation)

---

# Task 4 (Agent 2) — Microsoft Outlook Email & Calendar Sync Integration

## Summary

Added full Microsoft Outlook email and calendar synchronization support to the existing sync routes. The Google sync was already working — this task implemented the Outlook branch using the Microsoft Graph API client (`src/lib/microsoft.ts`) that was already created by a previous agent.

### 1. Prisma Schema Update
- **File**: `prisma/schema.prisma`
  - Added `source` (String, default "local") to `Email` model — tracks whether email came from Gmail, Outlook, or was created locally
  - Ran `bun run db:push` to sync schema changes and regenerate Prisma client
  - This aligns the Email model with CalendarEvent which already had a `source` field

### 2. Email Sync Route — Outlook Support
- **File**: `src/app/api/emails/sync/route.ts` — Replaced 501 placeholder with full Outlook implementation
  - Imported `fetchOutlookEmails` and `OutlookMessage` from `@/lib/microsoft`
  - Outlook branch calls `fetchOutlookEmails(account.id, maxResults)` to fetch messages via Microsoft Graph API
  - Deduplication: checks `sourceId` (Outlook message ID) against existing emails, same pattern as Gmail
  - Created `categorizeOutlookEmail()` function — same heuristic rules as Gmail but typed for `OutlookMessage`:
    - `client` — Default for personal/direct emails
    - `newsletter` — Detected via unsubscribe, no-reply, mailing patterns
    - `admin` — System notifications, automated messages
    - `spam` — Detected via common spam patterns
  - Emails created with `source: 'outlook'` and Outlook message ID as `sourceId`
  - Tracks last sync time in `gmailHistoryId` field (reused for Outlook with `outlook-synced-` prefix)
  - Gmail branch now also sets `source: 'google'` on created emails (was missing before)
  - Renamed `categorizeEmail` to `categorizeGmailEmail` for clarity

### 3. Calendar Sync Route — Outlook Support
- **File**: `src/app/api/calendar/sync/route.ts` — Replaced 501 placeholder with full Outlook implementation
  - **GET handler (sync from remote)**:
    - Imported `fetchOutlookCalendarEvents` and `OutlookCalendarEvent` from `@/lib/microsoft`
    - Outlook branch calls `fetchOutlookCalendarEvents(account.id, timeMin, timeMax)`
    - Deduplication using `sourceId` (Outlook event ID) — same pattern as Google
    - Two-way sync: detects changes by comparing title, description, dates, location, isAllDay
    - Updates existing events when remote changes detected
    - Creates events with `source: 'outlook'` and Outlook event ID as `sourceId`
  - **POST handler (push to remote)**:
    - Imported `createOutlookCalendarEvent` and `CalendarEventInput` from `@/lib/microsoft`
    - Supports pushing local events to Outlook Calendar when `account.provider === 'outlook'`
    - Creates event remotely via `createOutlookCalendarEvent()`
    - Stores Outlook event ID as `sourceId` with `source: 'outlook'`
    - Removed the "Only Gmail calendar sync is currently supported" error message
  - Created `outlookEventNeedsUpdate()` function — same comparison logic as Google but typed for `OutlookCalendarEvent`
  - Separated Google/Outlook `CalendarEventInput` imports with aliases to avoid naming conflicts

### 4. Store Type Update
- **File**: `src/lib/store.ts` — Updated `Email` interface
  - Added `source: string` field to match Prisma schema

### 5. Email API Route Update
- **File**: `src/app/api/emails/route.ts` — Updated POST handler
  - Added `source: body.source || 'local'` to email creation data

### 6. UI Component Updates
- **File**: `src/components/email-inbox.tsx` — Dynamic source badge
  - Email source badge now shows "Outlook" (blue) or "Gmail" (emerald) based on `email.source`
  - Previously showed "Gmail" for all emails with `sourceId`
- **File**: `src/components/calendar-view.tsx` — Outlook calendar badge
  - Added Outlook badge (blue) for events with `source === 'outlook'`
  - Google badge (emerald) remains for events with `source === 'google'`
- **File**: `src/components/calendar-sync-button.tsx` — Provider-agnostic toast
  - Changed "Provenant de Google Calendar." to "Synchronisé depuis votre calendrier connecté."
  - Works correctly for both Google and Outlook accounts

## Technical Details
- Uses Microsoft Graph API v1.0 endpoints via `src/lib/microsoft.ts` (not modified)
- Outlook email endpoint: `https://graph.microsoft.com/v1.0/me/messages`
- Outlook calendar endpoint: `https://graph.microsoft.com/v1.0/me/calendar/calendarView`
- Token refresh handled transparently by `getFreshAccessToken()` in microsoft.ts
- 1-minute date comparison tolerance for calendar change detection (same as Google)
- Blue (#3b82f6) color for Outlook badges, emerald (#10b981) for Google badges
- All UI text in French
- Lint passes with 0 errors, 1 pre-existing warning

## Files Modified
- `prisma/schema.prisma` (added `source` field to Email model)
- `src/app/api/emails/sync/route.ts` (replaced Outlook 501 with full Graph API sync)
- `src/app/api/calendar/sync/route.ts` (replaced Outlook 501 with full Graph API sync + POST support)
- `src/lib/store.ts` (added `source` to Email interface)
- `src/app/api/emails/route.ts` (added source to email creation)
- `src/components/email-inbox.tsx` (dynamic Gmail/Outlook badge)
- `src/components/calendar-view.tsx` (added Outlook calendar badge)
- `src/components/calendar-sync-button.tsx` (provider-agnostic toast message)

---

# Task 9 — Real-time Notifications with SSE

## Summary

Implemented a comprehensive real-time notification system for the Maellis app using Server-Sent Events (SSE), which works natively with Next.js App Router (unlike WebSockets).

### 1. SSE Notifications Stream API
- **File**: `src/app/api/notifications/stream/route.ts` — GET endpoint returning SSE stream
  - Uses `ReadableStream` for SSE response with proper headers (`text/event-stream`, `no-cache`)
  - On connection, sends `connected` event and checks for pending notifications
  - Every 30 seconds, checks for:
    - Due reminders (not yet sent)
    - Tasks with approaching deadlines (within 24 hours)
    - Overdue invoices (status=sent, past due date)
    - Unread emails count
  - Sends heartbeat comments every 15 seconds to keep connection alive
  - Handles `AbortSignal` for cleanup when client disconnects
  - Marks sent reminders after pushing notification events
  - All events in SSE format: `data: {type, payload}\n\n`

### 2. Push Subscription API
- **File**: `src/app/api/notifications/subscribe/route.ts` — POST + DELETE endpoints
  - POST: Upsert push subscription (endpoint, p256dh, auth keys) to DB
  - DELETE: Remove push subscription by endpoint
  - Uses Prisma's `upsert` for idempotent subscription management

### 3. Prisma Schema Updates
- **File**: `prisma/schema.prisma`
  - Added `PushSubscription` model with `id`, `endpoint` (@unique), `p256dh`, `auth`, `userId`, `createdAt`
  - Added `pushSubscriptions PushSubscription[]` relation to User model
  - Ran `npx prisma db push` to sync schema

### 4. Client-side SSE Hook
- **File**: `src/hooks/use-realtime.ts` — `useRealtimeNotifications` React hook
  - Connects to `/api/notifications/stream` via `EventSource`
  - Auto-reconnect with exponential backoff (1s to 30s, with jitter)
  - Max 10 reconnect attempts before giving up
  - Handles 5 event types:
    - `reminder_due` — Browser notification + sound + refresh reminders/stats
    - `task_deadline_approaching` — Browser notification + sound for high priority + refresh tasks/stats
    - `invoice_overdue` — Browser notification + sound + refresh invoices/stats
    - `unread_emails` — Browser notification + refresh emails/stats
    - `notification_pending` — Browser notification + sound for urgent + refresh notifications
  - Reuses existing `showBrowserNotification` and `playNotificationSound` from `src/lib/notifications.ts`
  - Reconnects when window regains focus after being minimized
  - Returns `{ status, reconnect, disconnect, isConnected }`

### 5. RealtimeProvider Component
- **File**: `src/components/realtime-provider.tsx` — Provider wrapping the app
  - Uses `useRealtimeNotifications` hook for SSE connection lifecycle
  - Shows toast notifications for connection status changes
  - Offline indicator badge when disconnected (bottom of screen)
  - Attempts push notification subscription via service worker when available

### 6. Enhanced Service Worker
- **File**: `public/sw.js` — Upgraded from basic cache-first to multi-strategy
  - **Cache strategies**:
    - Static assets: cache-first with offline fallback
    - API requests: stale-while-revalidate
    - SSE stream: never cached (excluded)
  - **Push notification support**: Parses push data, shows branded Maellis notifications with actions
  - **Notification click handler**: Focuses existing window or opens new one, navigates to relevant URL
  - **Background sync**: `sync-emails` and `sync-calendar` tags for offline sync
  - Cache versioning (v2) with old cache cleanup on activate

### 7. Updated Main Page
- **File**: `src/app/page.tsx` — Added RealtimeProvider + connection indicator
  - Wrapped entire app with `<RealtimeProvider>`
  - Added real-time connection status indicator in header:
    - Green WiFi icon when connected
    - Spinning amber circle when connecting
    - Gray WiFi-off icon when disconnected
  - Imports `Wifi`, `WifiOff` icons from Lucide

## Technical Details
- SSE chosen over WebSocket for native Next.js App Router compatibility
- Uses `EventSource` browser API (no additional npm packages)
- Exponential backoff with jitter prevents thundering herd on reconnect
- `connectFnRef` pattern avoids circular reference in useCallback
- Lint passes with 0 errors, 0 warnings

## Files Created
- `src/app/api/notifications/stream/route.ts` (new — SSE stream endpoint)
- `src/app/api/notifications/subscribe/route.ts` (new — Push subscription management)
- `src/hooks/use-realtime.ts` (new — SSE React hook)
- `src/components/realtime-provider.tsx` (new — Realtime provider component)

## Files Modified
- `prisma/schema.prisma` (added PushSubscription model, relation on User)
- `public/sw.js` (complete rewrite — caching strategies, push, sync, notification click)
- `src/app/page.tsx` (added RealtimeProvider wrapper, connection status indicator)
