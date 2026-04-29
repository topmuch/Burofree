# Task 4 — Microsoft Graph API Integration

## Summary

Implemented comprehensive Microsoft Graph API integration for Outlook email and calendar sync, including both Microsoft and Google provider support in sync routes and a new Connected Accounts settings component.

## Work Completed

### 1. Microsoft Graph API Client Library (`src/lib/microsoft.ts`)
- **Outlook Mail Functions**:
  - `fetchOutlookEmails()` — Fetches messages from `/me/messages` with sender, subject, body, snippet, read status, attachments, conversation ID
  - `sendOutlookEmail()` — Sends emails via `/me/sendMail` with HTML body conversion
  - `markOutlookEmailRead()` — Marks messages as read via PATCH `/me/messages/{id}`
  - `deleteOutlookEmail()` — Deletes messages via DELETE `/me/messages/{id}`
- **Outlook Calendar Functions**:
  - `fetchOutlookCalendarEvents()` — Fetches calendar view from `/me/calendar/calendarView` with date range
  - `createOutlookCalendarEvent()` — Creates events via POST `/me/calendar/events`
  - `updateOutlookCalendarEvent()` — Updates events via PATCH `/me/calendar/events/{id}`
  - `deleteOutlookCalendarEvent()` — Deletes events via DELETE `/me/calendar/events/{id}`
- **Health Check**: `checkOutlookAccountHealth()` — Verifies connection, token validity, and permissions
- **Type Definitions**: `OutlookMessage`, `OutlookCalendarEvent`, `CalendarEventInput` interfaces
- Uses `getFreshAccessToken()` from token-refresh.ts for automatic token refresh
- Decrypts tokens via crypto.ts before API calls
- Handles 401 responses by returning null (token needs re-auth)

### 2. Email Sync Route (`src/app/api/emails/sync/route.ts`)
- **POST** — Syncs emails from all or specific accounts
  - Detects provider from EmailAccount record (gmail/outlook)
  - Gmail sync via Gmail API v1 with full message details
  - Outlook sync via Microsoft Graph using `fetchOutlookEmails()`
  - Upserts emails into DB with provider-prefixed IDs (`gmail-*` / `outlook-*`)
  - Updates account's `updatedAt` on successful sync
- **GET** — Returns sync status for all or specific accounts
  - Shows message count, last sync time, token validity

### 3. Calendar Sync Route (`src/app/api/calendar/sync/route.ts`)
- **POST** — Syncs calendar events from all or specific accounts
  - Google Calendar sync via Calendar API v3
  - Outlook Calendar sync via Microsoft Graph using `fetchOutlookCalendarEvents()`
  - Upserts events into DB with provider-prefixed IDs (`gcal-*` / `outlook-*`)
  - Color codes: emerald for Google, amber for Outlook
  - Supports custom time range (timeMin/timeMax)
- **GET** — Returns calendar sync status for all or specific accounts

### 4. Account Health API (`src/app/api/accounts/health/route.ts`)
- **GET** — Checks account health and permissions
  - Verifies token validity via `getFreshAccessToken()`
  - Tests mail read access (Gmail profile / Outlook messages)
  - Tests calendar access (Google calendarList / Outlook calendar)
  - Reports send permission from stored scopes

### 5. Email Account Delete API (`src/app/api/email-accounts/[id]/route.ts`)
- **DELETE** — Removes a connected email account and its associated emails

### 6. Connected Accounts Component (`src/components/connected-accounts.tsx`)
- Card-based layout showing all connected accounts
- Provider-specific branding (Google/Outlook SVG icons, colors)
- Sync status: email count, event count, last sync time (relative format)
- Token health indicator: valid (green), expiring soon (amber), expired (red)
- Permission progress bar showing read/send/calendar access
- Per-account actions: Sync, Health check, Remove (with confirmation)
- Bulk "Tout synchroniser" button for all accounts
- "Ajouter" dialog with OAuth provider selection (Google/Outlook)
- Empty state with Unplug icon
- Framer Motion animations for card transitions
- French UI text matching the app's language

### 7. Settings Panel Update (`src/components/settings-panel.tsx`)
- Replaced basic email accounts section with ConnectedAccounts component
- Removed unused imports (Dialog, Badge, Mail, Plus, etc.)
- Removed unused state variables (addAccountOpen, accountProvider, etc.)
- Clean integration with existing card layout and section variants

## Technical Details
- All API calls use standard `fetch()` — no external Graph SDK
- Tokens encrypted at rest via crypto.ts (AES-256-GCM)
- Automatic token refresh via getFreshAccessToken() with 5-min buffer
- Provider normalization: `gmail` ↔ `google`/`azure-ad` ↔ `outlook`
- Graceful error handling — failed refresh returns null, not thrown
- Microsoft Graph API v1.0 endpoints for all operations
- Gmail API v1 + Google Calendar API v3 for Google sync
- All UI text in French, matching the app's dark theme (zinc-950, emerald accents)

## Files Created
- `src/lib/microsoft.ts` (new — Microsoft Graph API client)
- `src/app/api/emails/sync/route.ts` (new — email sync route)
- `src/app/api/calendar/sync/route.ts` (new — calendar sync route)
- `src/app/api/accounts/health/route.ts` (new — account health check)
- `src/app/api/email-accounts/[id]/route.ts` (new — account delete)
- `src/components/connected-accounts.tsx` (new — connected accounts UI)

## Files Modified
- `src/components/settings-panel.tsx` (replaced email accounts section with ConnectedAccounts component)
