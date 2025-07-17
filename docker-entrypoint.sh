#!/bin/sh

# Exit on any error
set -e

echo "Starting Vercel AI Chatbot..."

# Run database migrations if POSTGRES_URL is set
if [ -n "$POSTGRES_URL" ]; then
  echo "Running database migrations..."
  tsx lib/db/migrate.ts
else
  echo "Warning: POSTGRES_URL not set, skipping database migrations"
fi

echo "Starting Next.js server..."
exec node server.js
