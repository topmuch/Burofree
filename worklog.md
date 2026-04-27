---
Task ID: 1
Agent: Main Agent
Task: Implement PRIORITÉ 2 — Productivité (5 features)

Work Log:
- Extended Prisma schema with 7 new models: Template, AutomationPreference, AutomationLog, Tag, TaskTag, EmailTag, DocumentTag, ProjectTag
- Added tag relations to existing models: Task, Email, Document, Project
- Pushed schema changes to SQLite database
- Created API routes for Templates (CRUD + apply + seed)
- Created API routes for Automations (preferences + logs + check)
- Created API routes for Analytics (overview + export CSV/PDF)
- Created API routes for Search (full-text search with LIKE, scoring, snippets)
- Created API routes for Tags (CRUD + assign/unassign bulk + seed)
- Created utility modules: search-utils.ts, automation-cron.ts, invoice-token.ts
- Created UI components: templates-panel.tsx, analytics-panel.tsx, global-search.tsx, tags-panel.tsx, automations-panel.tsx
- Updated Zustand store with 7 new interfaces, 20 new actions
- Updated TabType to include 'templates' | 'analytics'
- Updated sidebar-nav.tsx with Modèles (LayoutTemplate) and Analytics (BarChart3)
- Updated page.tsx with TemplatesPanel, AnalyticsPanel, GlobalSearch
- Updated settings-panel.tsx with TagsSection and AutomationsSection
- Fixed invoice viewing/printing bug (HMAC token-based PDF auth)
- Build succeeds with 72 API routes

Stage Summary:
- All 5 features of PRIORITÉ 2 are implemented
- Invoice PDF viewing/printing bug is fixed
- New sidebar entries: Modèles, Analytics
- Tags and Automations integrated into Settings panel
- Global search available via Cmd/Ctrl+K
