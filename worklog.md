---
Task ID: 2
Agent: Super Z (main)
Task: Fix invoice PDF printing + add Meetings & Contracts modules

Work Log:
- Diagnosed invoice PDF issue: Chromium was not installed, PDF generation fell back to HTML
- Installed Chromium via Playwright (npx playwright install chromium)
- Updated pdf-generator.ts to search Playwright Chromium paths + dynamic fallback
- Fixed logo 'M' → 'B' in PDF template
- Added Meeting and Contract models to Prisma schema
- Added project relations for Meeting and Contract
- Ran prisma db push to sync schema
- Created API routes: /api/meetings, /api/meetings/[id], /api/contracts, /api/contracts/[id]
- Created MeetingsPanel component with: status filters, create/edit dialog, meeting cards, upcoming meetings section, stats bar
- Created ContractsPanel component with: type/status filters, create dialog, contract table, view dialog with status change, stat cards, expiration detection
- Updated store.ts: added Meeting/Contract interfaces, CRUD methods, fetchMeetings/fetchContracts in fetchAll
- Updated TabType to include 'meetings' | 'contracts'
- Updated sidebar-nav.tsx: added Contrats (FileText icon) and Réunions (Video icon) entries
- Updated page.tsx: imported and registered MeetingsPanel/ContractsPanel in tabComponents/tabTitles
- Build verified successfully

Stage Summary:
- Invoice PDF now works (Chromium installed + detected)
- Two new modules fully functional: Réunions and Contrats
- Both modules have full CRUD: API routes, Zustand store, UI panels
- Sidebar and page routing updated for new tabs
