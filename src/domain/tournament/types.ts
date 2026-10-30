import type { PlayerId } from "../game/types";

/** M9: three independent formats (m9-plan §9.1). */
export type TournamentFormat = "round-robin" | "knockout" | "groups-knockout";
export const TOURNAMENT_FORMATS: readonly TournamentFormat[] = ["round-robin", "knockout", "groups-knockout"];

/** Where a side of a fixture comes from; resolved from the results (resolve.ts). */
export type Source =
  | { kind: "player"; id: PlayerId }
  | { kind: "winner"; fixture: string }
  | { kind: "group"; group: number; place: number }
  | { kind: "bye" };

export type Fixture = {
  id: string;
  /** "group" also covers a plain round robin (one group). */
  phase: "group" | "knockout";
  /** Group number (1…), null in the knockout. */
  group: number | null;
  /** Round within its phase, from 1; in the knockout the last round is the final. */
  round: number;
  slot: number;
  a: Source;
  b: Source;
};

export type Plan = { format: TournamentFormat; fixtures: Fixture[] };

/** What a played fixture contributes: winner, legs per player and the 3-dart average per player. */
export type FixtureResult = {
  fixtureId: string;
  winner: PlayerId;
  /** Partial: a decided fixture may lack a player's legs or average. */
  legs: Partial<Record<PlayerId, number>>;
  averages: Partial<Record<PlayerId, number>>;
};

export type FixtureStatus = "waiting" | "ready" | "done" | "bye";

export type ResolvedFixture = Omit<Fixture, "a" | "b"> & {
  a: PlayerId | null;
  b: PlayerId | null;
  status: FixtureStatus;
  winner: PlayerId | null;
};
