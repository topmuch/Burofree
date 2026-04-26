#!/bin/bash
# Migration script from SQLite to PostgreSQL
echo "🚀 Maellis PostgreSQL Migration"
echo "================================"

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo "Usage: DATABASE_URL=postgresql://maellis:maellis@localhost:5432/maellis ./scripts/migrate-to-pg.sh"
  exit 1
fi

echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Migration complete!"
