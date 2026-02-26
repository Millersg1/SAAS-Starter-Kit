# Migration Cleanup Checkpoint

## Completed
- Added `scripts/migrate.mjs` to apply all SQL files in `src/migrations` in order.
- Added `schema_migrations` tracking table to prevent re-running already applied migration files.
- Added CI step to run migrations before tests.

## Current Gap
- `server.js` still contains bootstrap DDL that creates/alters many CRM tables at startup.
- This bypasses versioned migration history and can hide schema drift.

## Next Required Migration Work
1. Move startup DDL from `server.js` into new migration files (starting at `028_*.sql`).
2. Remove the inline migration block from `server.js` after migration parity is verified.
3. Add a startup check that fails fast if pending migrations exist.
