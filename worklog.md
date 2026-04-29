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
