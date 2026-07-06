import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS platform_invitation (
    id          TEXT        PRIMARY KEY,
    email       TEXT        NOT NULL,
    name        TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMP   NOT NULL,
    accepted_at TIMESTAMP
  )
`;

console.log("✓ Created platform_invitation table");
