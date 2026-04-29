# Task 4 — Google API Integration for Gmail and Google Calendar Sync

## Agent: Main Developer
## Status: Completed

## What was done:
1. Updated Prisma schema with `sourceId` on CalendarEvent & Email, `gmailHistoryId` on EmailAccount
2. Created comprehensive Google API client library (`src/lib/google.ts`) with 8 functions for Gmail and Calendar
3. Created Gmail sync API route (`src/app/api/emails/sync/route.ts`) with deduplication and categorization
4. Created Calendar sync API route (`src/app/api/calendar/sync/route.ts`) with two-way sync and push support
5. Created Email Sync Button component with loading states and toast notifications
6. Created Calendar Sync Button component with loading states and toast notifications
7. Updated store types to include new fields (sourceId, gmailHistoryId)
8. Integrated sync buttons into email-inbox and calendar-view components
9. Added source badges (Gmail/Google) to synced emails and events
10. Updated existing API routes to handle sourceId field
11. Lint passes with 0 errors, 0 warnings

## Key decisions:
- Used standard `fetch()` instead of googleapis npm package for simplicity
- Added `sourceId` to Email model (not just CalendarEvent) for email dedup
- Batch processing of 10 concurrent Gmail message fetches to avoid rate limiting
- Heuristic email categorization (client/newsletter/admin/spam) instead of AI for speed
- 1-minute date comparison tolerance for calendar change detection
- French UI text throughout to match existing app style

## Files created:
- `src/lib/google.ts`
- `src/app/api/emails/sync/route.ts`
- `src/app/api/calendar/sync/route.ts`
- `src/components/email-sync-button.tsx`
- `src/components/calendar-sync-button.tsx`

## Files modified:
- `prisma/schema.prisma`
- `src/lib/store.ts`
- `src/components/email-inbox.tsx`
- `src/components/calendar-view.tsx`
- `src/app/api/events/route.ts`
- `src/app/api/events/[id]/route.ts`
- `src/app/api/emails/route.ts`
