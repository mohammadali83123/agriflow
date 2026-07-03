import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy-initialize the db client so the module can be imported at build time
// without requiring DATABASE_URL. The actual connection is made at request time.
function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle({ client: sql, schema });
}

type Db = ReturnType<typeof getDb>;

let _db: Db | undefined;

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    if (!_db) {
      _db = getDb();
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
