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
