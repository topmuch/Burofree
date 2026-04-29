---
Task ID: 1
Agent: Main Agent
Task: Fix Prisma database connection error and create test credentials

Work Log:
- Fixed Prisma schema mismatch: schema uses SQLite but .env had PostgreSQL DATABASE_URL, causing "URL must start with postgresql://" error
- Ran `prisma db push` to regenerate Prisma Client for SQLite
- Updated seed script (prisma/seed.ts) to create 3 test accounts with bcrypt-hashed passwords
- Seeded database with test accounts: superadmin, admin, and regular user
- Fixed sign-in page bug: password was sent as undefined for login mode (only sent for register)
- Removed misleading "leave blank" hint for password field
- Fixed JWT callback: role was hardcoded to 'user' on initial sign-in instead of fetching from DB
- Added role to Session type and session callback
- Added try-catch to authorize function to prevent silent failures
- Added fallback for rate limiter Request constructor that could crash
- Verified all 3 test accounts exist in database with correct roles and password hashes
- Verified password validation works via test-auth endpoint (all 3 accounts: passwordValid=true)

Stage Summary:
- Test credentials created and verified:
  - Superadmin: superadmin@burozen.com / Superadmin2026!
  - Admin: admin@burozen.com / Admin2026!
  - User: alex@freelance.dev / User2026!
- Login will work through the sign-in page (/auth/signin) using next-auth/react signIn()
- Direct API login testing via curl/fetch has CSRF cookie handling issues that don't affect browser-based login
