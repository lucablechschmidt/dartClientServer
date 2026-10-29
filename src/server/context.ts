import { getDb } from "@/db/client";
import { SqliteAuthRepository } from "@/db/sqlite-auth-repository";
import { SqliteMatchRepository } from "@/db/sqlite-match-repository";
import { SqlitePlayerRepository } from "@/db/sqlite-player-repository";
import { matchHub } from "./match-events";
import type { Deps } from "./deps";

/** Production dependencies. Only here is SQLite touched. */
export function productionDeps(): Deps {
  return {
    players: new SqlitePlayerRepository(getDb()),
    matches: new SqliteMatchRepository(getDb()),
    auth: new SqliteAuthRepository(getDb()),
    newId: () => crypto.randomUUID(),
    now: () => Date.now(),
    random: (bytes) => crypto.getRandomValues(new Uint8Array(bytes)),
    events: matchHub(),
    // Native better-sqlite3 transaction on the connection both repositories share; nested
    // transactions inside the repositories become savepoints.
    transaction: (fn) => getDb().transaction(() => fn()),
  };
}
