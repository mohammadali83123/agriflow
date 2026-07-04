/**
 * Migration: add created_at to invitation table
 * Better Auth expects this column — missing it causes a BetterAuthError
 * on the /admin/orgs/new route.
 *
 * Run: node --env-file=.env.local scripts/migrate-invitation-created-at.mjs
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

try {
  await sql`
    ALTER TABLE invitation
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()
  `;
  console.log("✓ Added created_at to invitation table");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
