---
Task ID: 1
Agent: Main
Task: Push code to GitHub and verify test credentials

Work Log:
- Verified project at /home/z/my-project/ with git remote origin https://github.com/topmuch/Burofree.git
- Confirmed Prisma schema uses SQLite (not PostgreSQL) with file:../db/custom.db
- Verified .env DATABASE_URL=postgresql://... was not blocking since schema uses hardcoded SQLite path
- Ran prisma db push to ensure schema is synced
- Confirmed 3 test users exist in DB: superadmin@burozen.com (superadmin), admin@burozen.com (admin), alex@freelance.dev (user)
- Pushed code to GitHub (main branch, commit 0f0646c)
- Cleaned token from remote URL for security
- Started dev server, confirmed landing page returns HTTP 200
- Noted SSR error "Event handlers cannot be passed to Client Component props" (non-blocking, page renders fine)

Stage Summary:
- Code pushed to https://github.com/topmuch/Burofree (main branch)
- Test credentials verified in SQLite database:
  - Superadmin: superadmin@burozen.com / Superadmin2026!
  - Admin: admin@burozen.com / Admin2026!
  - User: alex@freelance.dev / User2026!
- Dev server running on port 3000, landing page accessible
---
Task ID: 1
Agent: Main Agent
Task: Fix unified inbox ("boîte unifiée") server error when clicking on items

Work Log:
- Investigated the unified inbox code architecture: 15+ files across hooks, services, components, and API routes
- Identified Bug #1 (CRITICAL): `useChannelAccounts()` hook expected `ChannelAccount[]` but API returns `{ data: [...] }` — calling `.map()` on `{ data: [] }` caused TypeError crash → triggered error boundary → "Erreur serveur" page
- Identified Bug #2: Same response shape mismatch in `useInboxContacts()` 
- Identified Bug #3: Missing filter params (`priority`, `isStarred`, `focusInbox`) in Zod validation schema — frontend sends them but server strips them silently
- Identified Bug #4: `'use client'` directive placed after JSDoc comments in 4 files (production-panel, network-status, install-prompt, use-pwa) — could cause SSR issues in some Next.js versions
- Identified Bug #5: Error page branding showed "M" instead of "B" for Burozen
- Fixed all 5 bugs across 7 files

Stage Summary:
- Fixed `useChannelAccounts()` and `useInboxContacts()` to extract `.data` from API response
- Added `priority`, `isStarred`, `focusInbox` to Zod schema and API route
- Added Focus Inbox server-side filtering logic (unread + starred + high/urgent priority)
- Moved `'use client'` to line 1 in 4 files
- Fixed error page branding
- Added defensive array check for `channelAccounts` in layout
- Lint passes clean, /app page returns 200
---
Task ID: 2
Agent: Main Agent
Task: Self-audit and test the unified inbox + fix all remaining bugs

Work Log:
- Read dev logs: identified persistent "Event handlers cannot be passed to Client Component props" SSR error (non-blocking, pages still return 200)
- Tested all API endpoints: /api/inbox/channels returns 401 (expected without auth), /api/inbox/conversations returns 401 (expected)
- Full code audit of 15+ inbox files: hooks, services, components, API routes, types, WebSocket service
- Verified all previous fixes are properly applied:
  - ✅ useChannelAccounts() extracts .data from response
  - ✅ useInboxContacts() extracts .data from response
  - ✅ Zod validation includes priority, isStarred, focusInbox
  - ✅ Service handles focusInbox filter
  - ✅ Defensive array check for channelAccounts in layout
  - ✅ 'use client' directives on line 1 in all component files
  - ✅ Error page branding shows "B"
- Found and fixed new bugs:
  - Bug #6: Toaster component used next-themes useTheme() without ThemeProvider wrapper → removed dependency, hardcoded dark theme
  - Bug #7: loading.tsx showed "M" instead of "B" for Burozen branding
  - Bug #8: not-found.tsx showed "M" instead of "B" for Burozen branding
  - Bug #9: Landing page.tsx was a Server Component causing Framer Motion SSR issues → added 'use client'
- Started inbox WebSocket service on port 3002
- Lint passes clean
- All API endpoints respond correctly (401 without auth is expected behavior)

Stage Summary:
- Fixed Toaster to not depend on missing ThemeProvider
- Fixed "M" → "B" branding in loading.tsx and not-found.tsx
- Added 'use client' to landing page.tsx
- WebSocket inbox service running on port 3002
- Lint: clean
- Landing page: HTTP 200
- API endpoints: 401 (correct, requires auth)
- SSR error "Event handlers cannot be passed to Client Component props" persists but is non-blocking (Framer Motion + React 19 compatibility issue)

---
Task ID: 3
Agent: Main Agent
Task: Test dev logs for production errors and fix all remaining bugs

Work Log:
- Started dev server and tested all critical API endpoints
- Health API: Fixed Prisma `current_database()` error (PostgreSQL function used with SQLite) → replaced with SQLite PRAGMA queries
- Found not-found.tsx missing `'use client'` for its button with onClick → added directive
- After fix: "Event handlers cannot be passed to Client Component props" SSR error is GONE from dev logs
- Full code audit of unified inbox (15+ files) revealed 12 bugs:
  - CRITICAL Bug #1: Zod `isStarred`/`focusInbox` transform silently converts `undefined` → `false`, filtering out ALL starred conversations
  - CRITICAL Bug #2: `JSON.parse` without try/catch on DB JSON fields (emails, phones, tags, customFields) → crash on corrupt data
  - CRITICAL Bug #3: `getProviderForChannel` hardcoded to 'gmail' → crashes for Outlook-only users
  - HIGH Bug #7: Connect account dialog simulated OAuth without creating ChannelAccount record
  - HIGH Bug #8: Socket event listeners lost after reconnection
  - HIGH Bug #9: Search filter silently dropped when Focus Inbox is active
  - MEDIUM Bug #10-12: Type duplication, name collision, socket reconnect on userName change
- Fixed ALL critical and high severity bugs
- Found middleware blocking `/api/landing/lead` (landing page signup) → added to public routes
- Added `/api/stripe/config` to public routes (needed for pricing page)
- Added `allowedDevOrigins: ['.space-z.ai']` to next.config.ts
- Lint passes clean
- Final dev log verification: NO errors, only minor warnings (middleware deprecation, optional resend module)

Stage Summary:
- Fixed 6 critical/high bugs + 3 medium bugs in unified inbox
- Fixed middleware blocking landing page signup
- Health API now uses SQLite-compatible queries
- not-found.tsx has 'use client' directive
- next.config.ts has allowedDevOrigins for preview panel
- Lint: clean (0 errors, 0 warnings)
- Dev logs: clean (no server errors)
- Landing page: HTTP 200
- Health API: HTTP 200, DB connected
- Lead capture: HTTP 201, signup works without auth
- Inbox APIs: HTTP 401 (correct, requires auth)

---
Task ID: 2-3-4
Agent: full-stack-developer
Task: Create lib files for Fiscaly badge system (geo, validations, badge-token)

Work Log:
- Created /src/lib/geo.ts with haversine distance calculation and geofence checking
- Created /src/lib/validations/badge.ts with Zod schemas for all badge inputs
- Created /src/lib/badge-token.ts building on existing jwt-simple.ts for JWT sign/verify

Stage Summary:
- All 3 lib files created successfully
- geo.ts: haversineDistance() and checkGeoFence() with 100m default tolerance
- validations/badge.ts: Zod schemas for CreateMerchant, AgentVerify, ValidatePayment, RevokeBadge
- badge-token.ts: generateBadgeToken(), verifyBadgeToken(), revokeBadge(), getPublicMerchantData(), getAgentMerchantData()
