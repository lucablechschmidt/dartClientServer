import type { AuthRepository } from "@/db/auth-repository";
import type { MatchRepository, PlayerRepository } from "@/db/repository";
import type { MatchEvents } from "./match-events";

/** Service dependencies, replaceable in tests (architecture.md §9). */
export type Deps = {
  players: PlayerRepository;
  matches: MatchRepository;
  auth: AuthRepository;
  newId: () => string;
  now: () => number;
  /** Random bytes for tokens (M3); deterministic in tests. */
  random: (bytes: number) => Uint8Array;
  /** Live state (M4): called after every stored change to a match. */
  events: MatchEvents;
  /**
   * Runs `fn` atomically (architecture.md §5): every service that writes more than once wraps its
   * writes in here. Synchronous on purpose: async work (bcrypt) happens before, never inside.
   */
  transaction: <T>(fn: () => T) => T;
};
