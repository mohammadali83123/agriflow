import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const existing = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('invoice','invoice_line','payment','payment_allocation')
  `;
  console.log("Sprint 8 tables present:", existing.map(r => r.table_name));

  const migrationFile = readFileSync("drizzle/0006_dizzy_gideon.sql", "utf8");
  const hash = createHash("sha256").update(migrationFile).digest("hex");

  // Check drizzle tracking
  let tracked = [];
  try {
    tracked = await sql`SELECT * FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`;
  } catch {
    try {
      tracked = await sql`SELECT * FROM __drizzle_migrations WHERE hash = ${hash}`;
    } catch {
      console.log("Could not read migrations table — may not exist yet.");
    }
  }

  if (tracked.length > 0) {
    console.log("Migration 0006 already tracked. Nothing to do.");
    return;
  }

  try {
    await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
    console.log("Marked 0006 in drizzle.__drizzle_migrations");
  } catch {
    await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
    console.log("Marked 0006 in __drizzle_migrations");
  }

  console.log("Done.");
}

run().catch(err => { console.error(err); process.exit(1); });
