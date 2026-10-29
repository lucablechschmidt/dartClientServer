import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS = resolve(process.cwd(), "drizzle");

/** Opens (and creates) a SQLite file in WAL mode and migrates it to the current schema. */
export function openDatabase(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

const globalForDb = globalThis as unknown as { __dartsDb?: Db };

/** One connection per process; survives hot reload in development. */
export function getDb(): Db {
  if (!globalForDb.__dartsDb) {
    globalForDb.__dartsDb = openDatabase(process.env.DATABASE_PATH ?? "./data/darts.db");
  }
  return globalForDb.__dartsDb;
}
