import { openDatabase } from "@/db/client";
import { MemoryAuthRepository } from "@/db/memory-auth-repository";
import { MemoryMatchRepository } from "@/db/memory-match-repository";
import { MemoryPlayerRepository } from "@/db/memory-player-repository";
import { MemoryStore } from "@/db/memory-store";
import { SqliteAuthRepository } from "@/db/sqlite-auth-repository";
import { SqliteMatchRepository } from "@/db/sqlite-match-repository";
import { SqlitePlayerRepository } from "@/db/sqlite-player-repository";
import type { Deps } from "./deps";

/** Counter-based ids (`id1`, `id2`, …) so tests can predict them. */
export function counterIds(prefix = "id"): () => string {
  let n = 0;
  return () => `${prefix}${++n}`;
}

/** Deterministic, but different, random bytes on every call (distinct tokens). */
export function seededRandom(): (bytes: number) => Uint8Array {
  let seed = 0;
  return (bytes) => new Uint8Array(bytes).fill(++seed % 256);
}

type MemoryDeps = Deps & { store: MemoryStore; auth: MemoryAuthRepository };

/**
 * Test dependencies on the in-memory repositories, which share one `store` that tests may inspect.
 * `transaction` just runs the function: memory repositories cannot roll back; atomicity is tested
 * against SQLite (`sqliteDeps`).
 */
export function memoryDeps(overrides: Partial<Deps> = {}): MemoryDeps {
  const store = new MemoryStore();
  return {
    store,
    players: new MemoryPlayerRepository(store),
    matches: new MemoryMatchRepository(store),
    auth: new MemoryAuthRepository(),
    newId: counterIds(),
    now: () => 1_000_000,
    random: seededRandom(),
    events: { publish: () => undefined },
    transaction: (fn) => fn(),
    ...overrides,
  } as MemoryDeps;
}

/** Test dependencies on a fresh in-memory SQLite database with real transactions. */
export function sqliteDeps(overrides: Partial<Deps> = {}): Deps {
  const db = openDatabase(":memory:");
  return {
    players: new SqlitePlayerRepository(db),
    matches: new SqliteMatchRepository(db),
    auth: new SqliteAuthRepository(db),
    newId: counterIds(),
    now: () => 1_000_000,
    random: seededRandom(),
    events: { publish: () => undefined },
    transaction: (fn) => db.transaction(() => fn()),
    ...overrides,
  };
}
