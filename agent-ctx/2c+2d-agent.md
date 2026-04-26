# Task 2c+2d — Enhanced Time Tracking & Docker Deployment

## Summary

Implemented enhanced time tracking with billing goals, revenue tracking, smart break reminders, and comprehensive time reports. Created full Docker + PostgreSQL deployment setup for production.

## Task C: Enhanced Time Tracking

### 1. Prisma Schema Updates
- **File**: `prisma/schema.prisma`
  - Added `hourlyRate` (Float?) to User — hourly billing rate
  - Added `weeklyTargetHours` (Float?) to User — target billable hours per week
  - Added `weeklyTargetRevenue` (Float?) to User — target weekly revenue
  - Added `maxDailyHours` (Float?) to User — max work hours before break suggestion
  - Ran `npx prisma db push --accept-data-loss` to sync

### 2. Weekly Billing Goals API
- **File**: `src/app/api/time-entries/goals/route.ts`
  - **GET**: Returns comprehensive billing goal progress
    - Target hours & revenue from user settings
    - Tracked/billable hours this week
    - Revenue calculation (billable hours × hourly rate)
    - Percentage progress toward goal
    - Daily breakdown (Mon-Sun)
    - Project breakdown with hours & revenue
  - **POST**: Set/update weekly billing goal
    - Accepts: targetHours, targetRevenue, hourlyRate

### 3. Time Reports API
- **File**: `src/app/api/time-entries/reports/route.ts`
  - **GET**: Generates time tracking reports
    - Query params: period (week/month/year/custom), projectId, startDate, endDate, format
    - Returns: total hours, billable hours, revenue, project breakdown
    - Aggregation: daily (week), weekly (month), monthly (year)
    - CSV export via `?format=csv` with proper Content-Disposition header
    - Project breakdown with percentage allocation

### 4. Smart Break Reminders API
- **File**: `src/app/api/time-entries/breaks/route.ts`
  - **GET**: Analyzes work patterns and suggests breaks
    - Triggers if user worked 2+ hours without break → suggest long break
    - Triggers if worked 1.5h → suggest short break
    - If daily hours exceed configured max → suggest stopping
    - If billable ratio < 50% with 2+ hours → suggest reviewing tasks
    - Returns: shouldBreak, reason, breakType (short/long/stop), workedMinutes, billableRatio

### 5. Enhanced Time Tracker Component
- **File**: `src/components/time-tracker.tsx` — Complete rewrite with new features:
  - **Billing Goal Progress Bar**: Shows weekly billable hours progress with percentage
  - **Revenue Counter**: Real-time revenue display during active timer based on hourly rate
  - **Project Breakdown**: Mini stacked bar showing hours per project
  - **Smart Break Indicator**: Pulsing amber card when break is suggested, with reason and break type
  - **Daily Summary Card**: Compact view of today's tracked hours, billable hours, and revenue
  - **Quick Timer Actions**: 30min, 1h, 2h preset buttons for quick time entry
  - **Goal Settings Dialog**: Configure target hours, hourly rate, and revenue target
  - **Sub-tab navigation**: "Suivi" / "Rapports" toggle via TimeView wrapper
  - All within existing dark theme with emerald/amber accents

### 6. Time Reports Component
- **File**: `src/components/time-reports.tsx` — Comprehensive reports view:
  - Period selector (Cette semaine, Ce mois, Cette année, Personnalisé)
  - Custom date range inputs
  - Project filter dropdown
  - Summary cards: Total hours, Billable hours, Revenue, Avg hourly rate
  - Bar chart showing daily/weekly/monthly hours (Recharts)
  - Project breakdown with progress bars and percentages
  - Period summary with billable ratio
  - Export CSV button (downloads from API)
  - Matches existing dashboard style (dark theme, emerald/amber)

### 7. Time View Wrapper
- **File**: `src/components/time-view.tsx` — Sub-tab component
  - Toggle between "Suivi" (tracker) and "Rapports" (reports) views
  - Integrated into page.tsx as the `time` tab component

### 8. Store Updates
- **File**: `src/lib/store.ts`
  - Added `TimeGoals` interface (targetHours, targetRevenue, trackedHours, billableHours, revenue, percentageProgress, etc.)
  - Added `TimeReport` interface (period, totalHours, billableHours, revenue, projectBreakdown, aggregation)
  - Added `BreakSuggestion` interface (shouldBreak, reason, breakType, workedMinutes, billableRatio)
  - Added `User` interface fields: hourlyRate, weeklyTargetHours, weeklyTargetRevenue, maxDailyHours
  - Added state: `timeGoals`, `timeReports`, `breakSuggestion`
  - Added actions: `fetchTimeGoals`, `fetchTimeReports`, `fetchBreakSuggestion`, `setBillingGoal`

### 9. Page Integration
- **File**: `src/app/page.tsx`
  - Replaced `TimeTracker` with `TimeView` component in tabComponents
  - Updated import

## Task D: Docker + PostgreSQL Deployment Setup

### 1. Dockerfile
- **File**: `Dockerfile`
  - Multi-stage build (base → deps → builder → runner)
  - deps: installs dependencies from package.json/bun.lock
  - builder: generates Prisma client and runs `npm run build`
  - runner: copies standalone output, static files, prisma schema, db folder
  - Runs as non-root `nextjs` user on port 3000

### 2. docker-compose.yml
- **File**: `docker-compose.yml`
  - app service: builds from Dockerfile, exposes port 3000
  - db service: PostgreSQL 16 Alpine with health check
  - All environment variables for OAuth, encryption, Stripe, etc.
  - Named volume for PostgreSQL data persistence

### 3. nginx.conf
- **File**: `nginx.conf`
  - Reverse proxy to app:3000
  - WebSocket/SSE support (Connection upgrade, no buffering)
  - Static file caching (365 days for /_next/static)
  - Service worker no-cache policy
  - Proper proxy headers (X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)

### 4. docker-compose.prod.yml
- **File**: `docker-compose.prod.yml`
  - Production compose with SSL support
  - app + db services with maellis-network bridge
  - nginx service with certbot volume mounts
  - certbot service for automatic SSL renewal
  - Environment variable substitution for passwords and domain

### 5. Migration Script
- **File**: `scripts/migrate-to-pg.sh`
  - Checks for DATABASE_URL environment variable
  - Runs `npx prisma migrate deploy` for PostgreSQL migration

### 6. Environment Template
- **File**: `.env.example`
  - Added PostgreSQL connection string template
  - Added DOMAIN variable
  - Added DB_PASSWORD variable
  - Added Stripe environment variables

### 7. Docker Ignore
- **File**: `.dockerignore`
  - Excludes node_modules, .next, .git, logs, env files from Docker context

## Pre-existing Fixes
- **File**: `src/lib/pdf-generator.ts` — Fixed `require('fs')` to use ES import `existsSync` from `fs`

## Technical Details
- All UI text in French
- Emerald (#10b981) and amber (#f59e0b) accent colors only
- Lint passes with 0 errors, 0 warnings
- All API endpoints tested and returning correct data
- Dark theme consistent with existing dashboard

## Files Created
- `src/app/api/time-entries/goals/route.ts` (new — Billing goals API)
- `src/app/api/time-entries/reports/route.ts` (new — Time reports API)
- `src/app/api/time-entries/breaks/route.ts` (new — Smart break suggestions API)
- `src/components/time-reports.tsx` (new — Reports view component)
- `src/components/time-view.tsx` (new — Sub-tab wrapper)
- `Dockerfile` (new — Multi-stage Docker build)
- `docker-compose.yml` (new — Dev Docker Compose)
- `docker-compose.prod.yml` (new — Production Docker Compose with SSL)
- `nginx.conf` (new — Nginx reverse proxy config)
- `scripts/migrate-to-pg.sh` (new — PostgreSQL migration script)
- `.dockerignore` (new — Docker build exclusions)

## Files Modified
- `prisma/schema.prisma` (added hourlyRate, weeklyTargetHours, weeklyTargetRevenue, maxDailyHours to User)
- `src/lib/store.ts` (added TimeGoals, TimeReport, BreakSuggestion interfaces; added state + actions)
- `src/components/time-tracker.tsx` (complete rewrite with billing goals, revenue, breaks, quick actions)
- `src/app/page.tsx` (replaced TimeTracker with TimeView)
- `.env.example` (added PostgreSQL, domain, deployment, Stripe variables)
- `src/lib/pdf-generator.ts` (fixed require to ES import)
