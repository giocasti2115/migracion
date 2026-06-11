#!/bin/bash
set -e

echo "▶️ Running Prisma migrations..."
npx prisma db push --accept-data-loss 2>&1
echo "✅ Migrations applied"

echo "▶️ Starting Next.js..."
exec node node_modules/.bin/next start
